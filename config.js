import { DeleteParameterCommand, GetParameterCommand, GetParametersByPathCommand, PutParameterCommand, SSMClient, } from "@aws-sdk/client-ssm";
import { GetFunctionConfigurationCommand, LambdaClient, UpdateFunctionConfigurationCommand, } from "@aws-sdk/client-lambda";
import { pipe, map } from "remeda";
import { useProject } from "./project.js";
import { useAWSClient } from "./credentials.js";
import { useIOT } from "./iot.js";
import { Stacks } from "./stacks/index.js";
const FALLBACK_STAGE = ".fallback";
const SECRET_UPDATED_AT_ENV = "SST_ADMIN_SECRET_UPDATED_AT";
export var Config;
(function (Config) {
    Config.PREFIX = {
        get STAGE() {
            const project = useProject();
            return project.config.ssmPrefix;
        },
        get FALLBACK() {
            const project = useProject();
            return `/sst/${project.config.name}/${FALLBACK_STAGE}/`;
        },
    };
    async function parameters() {
        const result = [];
        for await (const p of scanParameters(Config.PREFIX.FALLBACK)) {
            const parsed = parse(p.Name, Config.PREFIX.FALLBACK);
            if (parsed.type === "secrets")
                continue;
            result.push({
                ...parsed,
                value: p.Value,
            });
        }
        for await (const p of scanParameters(Config.PREFIX.STAGE)) {
            const parsed = parse(p.Name, Config.PREFIX.STAGE);
            if (parsed.type === "secrets")
                continue;
            result.push({
                ...parsed,
                value: p.Value,
            });
        }
        return result;
    }
    Config.parameters = parameters;
    function envFor(input) {
        return `SST_${input.type}_${input.prop}_${normalizeID(input.id)}`;
    }
    Config.envFor = envFor;
    function pathFor(input) {
        return `${input.fallback ? Config.PREFIX.FALLBACK : Config.PREFIX.STAGE}${input.type}/${normalizeID(input.id)}/${input.prop}`;
    }
    Config.pathFor = pathFor;
    function normalizeID(input) {
        return input.replace(/-/g, "_");
    }
    Config.normalizeID = normalizeID;
    async function secrets() {
        const result = {};
        for await (const p of scanParameters(Config.PREFIX.STAGE + "Secret")) {
            const parsed = parse(p.Name, Config.PREFIX.STAGE);
            if (!result[parsed.id])
                result[parsed.id] = {};
            result[parsed.id].value = p.Value;
        }
        for await (const p of scanParameters(Config.PREFIX.FALLBACK + "Secret")) {
            const parsed = parse(p.Name, Config.PREFIX.FALLBACK);
            if (!result[parsed.id])
                result[parsed.id] = {};
            result[parsed.id].fallback = p.Value;
        }
        return result;
    }
    Config.secrets = secrets;
    async function env() {
        const project = useProject();
        const parameters = await Config.parameters();
        const env = {
            SST_APP: project.config.name,
            SST_STAGE: project.config.stage,
            ...pipe(parameters, map((p) => [envFor(p), p.value]), Object.fromEntries),
        };
        return env;
    }
    Config.env = env;
    async function setSecret(input) {
        const paramName = pathFor({
            id: input.key,
            type: "Secret",
            prop: "value",
            fallback: input.fallback,
        });
        try {
            await putParameter(paramName, input.value);
        }
        catch (e) {
            // If the parameter was previously ADVANCED, re-create it in STANDARD tier.
            const wasAdvanced = e.name === "ValidationException" &&
                e.message.startsWith("This parameter uses the advanced-parameter tier. You can't downgrade a parameter from the advanced-parameter tier to the standard-parameter tier.");
            if (!wasAdvanced)
                throw e;
            await deleteParameter(paramName);
            await putParameter(paramName, input.value);
        }
        // Publish event
        const iot = await useIOT();
        const topic = `${iot.prefix}/events`;
        await iot.publish(topic, "config.secret.updated", { name: input.key });
    }
    Config.setSecret = setSecret;
    async function getSecret(input) {
        const result = await getParameter(pathFor({
            id: input.key,
            prop: "value",
            type: "Secret",
            fallback: input.fallback,
        }));
        return result.Parameter?.Value;
    }
    Config.getSecret = getSecret;
    async function removeSecret(input) {
        await deleteParameter(pathFor({
            id: input.key,
            type: "Secret",
            prop: "value",
            fallback: input.fallback,
        }));
    }
    Config.removeSecret = removeSecret;
    async function restart(keys) {
        // Note: Currently functions and sites with prefetch secrets are not restarted
        const metadata = await Stacks.metadata();
        const siteData = Object.values(metadata)
            .flat()
            .filter((c) => c.type === "AstroSite" ||
            c.type === "NextjsSite" ||
            c.type === "RemixSite" ||
            c.type === "SolidStartSite" ||
            c.type === "SvelteKitSite")
            .filter((c) => keys.some((key) => c.data.secrets.includes(key)));
        const siteDataPlaceholder = siteData.filter((c) => c.data.mode === "placeholder");
        const siteDataWithPrefetchSecrets = siteData
            .filter((c) => c.data.mode === "deployed")
            .filter((c) => c.data.prefetchSecrets);
        const siteDataEdge = siteData
            .filter((c) => c.data.mode === "deployed")
            .filter((c) => !c.data.prefetchSecrets)
            .filter((c) => c.data.edge);
        const siteDataRegional = siteData
            .filter((c) => c.data.mode === "deployed")
            .filter((c) => !c.data.prefetchSecrets)
            .filter((c) => !c.data.edge);
        const regionalSiteArns = siteData.map((s) => s.data.server);
        const functionData = Object.values(metadata)
            .flat()
            .filter((c) => c.type === "Function")
            // filter out SSR functions for sites
            .filter((c) => !regionalSiteArns.includes(c.data.arn))
            .filter((c) => keys.some((key) => c.data.secrets.includes(key)));
        const functionDataWithPrefetchSecrets = functionData.filter((c) => c.data.prefetchSecrets);
        const functionDataWithoutPrefetchSecrets = functionData.filter((c) => !c.data.prefetchSecrets);
        // Restart sites
        const restartedSites = (await Promise.all(siteDataRegional.map(async (s) => {
            const restarted = await restartFunction(s.data.server);
            return restarted ? s : restarted;
        }))).filter((c) => Boolean(c));
        // Restart functions
        const restartedFunctions = (await Promise.all(functionDataWithoutPrefetchSecrets.map(async (f) => {
            const restarted = await restartFunction(f.data.arn);
            return restarted ? f : restarted;
        }))).filter((c) => Boolean(c));
        return {
            edgeSites: siteDataEdge,
            sites: restartedSites,
            placeholderSites: siteDataPlaceholder,
            functions: restartedFunctions,
            sitesWithPrefetch: siteDataWithPrefetchSecrets,
            functionsWithPrefetch: functionDataWithPrefetchSecrets,
        };
    }
    Config.restart = restart;
})(Config || (Config = {}));
async function* scanParameters(prefix) {
    const ssm = useAWSClient(SSMClient);
    let token;
    while (true) {
        const results = await ssm.send(new GetParametersByPathCommand({
            Path: prefix,
            WithDecryption: true,
            Recursive: true,
            NextToken: token,
        }));
        yield* results.Parameters || [];
        if (!results.NextToken)
            break;
        token = results.NextToken;
    }
}
function getParameter(name) {
    const ssm = useAWSClient(SSMClient);
    return ssm.send(new GetParameterCommand({
        Name: name,
        WithDecryption: true,
    }));
}
function putParameter(name, value) {
    const ssm = useAWSClient(SSMClient);
    return ssm.send(new PutParameterCommand({
        Name: name,
        Value: value,
        Type: "SecureString",
        Overwrite: true,
        Tier: value.length > 4096 ? "Advanced" : "Standard",
    }));
}
function deleteParameter(name) {
    const ssm = useAWSClient(SSMClient);
    return ssm.send(new DeleteParameterCommand({
        Name: name,
    }));
}
function parse(ssmName, prefix) {
    const parts = ssmName.substring(prefix.length).split("/");
    return {
        type: parts[0],
        id: parts[1],
        prop: parts.slice(2).join("/"),
    };
}
async function restartFunction(arn) {
    const lambda = useAWSClient(LambdaClient);
    // Note: in the case where the function is removed, but the metadata
    //       is not updated, we ignore the Function not found error.
    try {
        const config = await lambda.send(new GetFunctionConfigurationCommand({
            FunctionName: arn,
        }));
        await lambda.send(new UpdateFunctionConfigurationCommand({
            FunctionName: arn,
            Environment: {
                Variables: {
                    ...(config.Environment?.Variables || {}),
                    [SECRET_UPDATED_AT_ENV]: Date.now().toString(),
                },
            },
        }));
        return true;
    }
    catch (e) {
        if (e.name === "ResourceNotFoundException" &&
            e.message.startsWith("Function not found")) {
            return;
        }
    }
}

/**
 * This file is copied from https://github.com/aws/aws-cdk/blob/master/packages/@aws-cdk/aws-lambda-python/lib/bundling.ts
 */
import fs from "fs";
import url from "url";
import path from "path";
import { DockerImage, FileSystem } from "aws-cdk-lib/core";
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
/**
 * Dependency files to exclude from the asset hash.
 */
export const DEPENDENCY_EXCLUDES = ["*.pyc"];
/**
 * The location in the image that the bundler image caches dependencies.
 */
export const BUNDLER_DEPENDENCIES_CACHE = "/var/dependencies";
/**
 * Produce bundled Lambda asset code
 */
export function bundle(options) {
    const { entry, runtime, architecture, outputPathSuffix, installCommands } = options;
    const stagedir = FileSystem.mkdtemp("python-bundling-");
    const hasDeps = stageDependencies(entry, stagedir);
    const hasInstallCommands = stageInstallCommands(installCommands || [], stagedir);
    // Determine which dockerfile to use. When dependencies are present, we use a
    // Dockerfile that can create a cacheable layer. We can't use this Dockerfile
    // if there aren't dependencies or the Dockerfile will complain about missing
    // sources.
    const dockerfile = hasInstallCommands
        ? "Dockerfile.custom"
        : hasDeps
            ? "Dockerfile.dependencies"
            : "Dockerfile";
    // copy Dockerfile to workdir
    fs.copyFileSync(path.join(__dirname, "../../support/python-runtime", dockerfile), path.join(stagedir, dockerfile));
    const image = DockerImage.fromBuild(stagedir, {
        buildArgs: {
            IMAGE: runtime.bundlingImage.image +
                // the default x86_64 doesn't need to be set explicitly
                (architecture == "arm_64" ? ":latest-arm64" : ""),
        },
        file: dockerfile,
        cacheFrom: options.dockerBuild?.cacheFrom,
        cacheTo: options.dockerBuild?.cacheTo,
    });
    const outputPath = path.join(options.out, outputPathSuffix);
    // Copy dependencies to the bundle if applicable.
    if (hasDeps || hasInstallCommands) {
        image.cp(`${BUNDLER_DEPENDENCIES_CACHE}/.`, outputPath);
    }
}
/**
 * Checks to see if the `entry` directory contains a type of dependency that
 * we know how to install.
 */
export function stageDependencies(entry, stagedir) {
    const prefixes = ["Pipfile", "pyproject", "poetry", "requirements.txt"];
    let found = false;
    for (const file of fs.readdirSync(entry)) {
        for (const prefix of prefixes) {
            if (file.startsWith(prefix)) {
                fs.copyFileSync(path.join(entry, file), path.join(stagedir, file));
                found = true;
            }
        }
    }
    return found;
}
function stageInstallCommands(installCommands, stagedir) {
    let found = false;
    if (installCommands.length > 0) {
        const filePath = path.join(stagedir, "sst-deps-install-command.sh");
        fs.writeFileSync(filePath, installCommands.join(" && "));
        fs.chmodSync(filePath, "755");
        found = true;
    }
    return found;
}

import { useBus } from "../../../bus.js";
import { Pothos } from "../../../pothos.js";
import fs from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);
import path from "path";
import { Colors } from "../../colors.js";
import { lazy } from "../../../util/lazy.js";
export const usePothosBuilder = lazy(() => {
    let routes = [];
    const bus = useBus();
    async function build(route) {
        try {
            const schema = await Pothos.generate({
                schema: route.schema,
                internalPackages: route.internalPackages,
            });
            await fs.writeFile(route.output, schema);
            // bus.publish("pothos.extracted", { file: route.output });
            if (Array.isArray(route.commands) && route.commands.length > 0) {
                await Promise.all(route.commands.map((cmd) => execAsync(cmd)));
            }
            Colors.line(Colors.success(`✔`), " Pothos: Extracted pothos schema");
        }
        catch (ex) {
            Colors.line(Colors.danger(`✖`), " Pothos: Failed to extract schema:");
            for (let line of ex.message.split("\n")) {
                console.log(`  `, line);
            }
        }
    }
    bus.subscribe("file.changed", async (evt) => {
        if (evt.properties.file.endsWith("out.mjs"))
            return;
        for (const route of routes) {
            const dir = path.dirname(route.schema);
            const relative = path.relative(dir, evt.properties.file);
            if (relative && !relative.startsWith("..") && !path.isAbsolute(relative))
                build(route);
        }
    });
    let first = false;
    bus.subscribe("stacks.metadata", async (evt) => {
        routes = Object.values(evt.properties)
            .flat()
            .filter((c) => c.type == "Api")
            .flatMap((c) => c.data.routes)
            .filter((r) => ["pothos", "graphql"].includes(r.type))
            .filter((r) => r.schema);
        if (first)
            return;
        for (const route of routes) {
            build(route);
            first = true;
        }
    });
});
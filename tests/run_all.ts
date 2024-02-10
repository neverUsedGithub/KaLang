import { formatError, transpileString } from "../src";
import { spawnSync } from "child_process";
import { readFile, readdir, writeFile } from "fs/promises";
import { ParsingError } from "../src/parser";
import { LexingError } from "../src/lexer";

async function run() {
    const files = (await readdir("./tests")).filter((name) => name.endsWith(".ka"));

    for (let file of files) {
        file = "./tests/" + file;
        const source = await readFile(file, { encoding: "utf-8" });

        let output: string;
        try {
            output = transpileString(source);
        } catch (e) {
            if (e instanceof ParsingError || e instanceof LexingError) {
                console.error(formatError(e, source, file));
                process.exit(1);
            }

            throw e;
        }
        const outFile = file.substring(0, file.length - 3) + ".js";

        await writeFile(outFile, output);

        console.log("test", file);
        const proc = spawnSync(`node ${outFile}`, { shell: true });
        if (proc.status !== 0) {
            console.error(`testcase '${file}' failed with the following output:`);
            console.error(proc.stdout.toString("utf-8") + proc.stderr.toString("utf-8"));
            process.exit(1);
        }
    }

    console.log("all testcases passed!");
}

run();

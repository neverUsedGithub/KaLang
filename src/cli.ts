#!/usr/bin/env node

import { version as langVersion } from "../package.json";
import { program } from "commander";
import { transpileString } from ".";
import { existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { ErrorFormatter } from "./error";
import * as path from "path";
import { LexingError } from "./lexer";
import { ParsingError } from "./parser";
import { FsProvider, TranspilingError } from "./transpiler";
import { globSync } from "glob";

const nodeFsProvider: FsProvider = { exists: existsSync };

program
    .name("kalang")
    .description("A CLI to interact with the KaLang transpiler.")
    .version(langVersion)
    .showHelpAfterError(true);

program
    .command("run")
    .argument("<file>", "the file to run")
    .action(async (file) => {
        const abspath = path.join(process.cwd(), file);
        const source = await readFile(abspath, { encoding: "utf-8" });
        let output: string;

        try {
            output = transpileString(source, abspath, nodeFsProvider);
        } catch (e) {
            if (e instanceof LexingError || e instanceof ParsingError || e instanceof TranspilingError) {
                const formatter = new ErrorFormatter(e);

                console.error(formatter.format(source, file));
                process.exit(1);
            }

            throw e;
        }

        eval(output);
    });

program
    .command("compile")
    .argument("<files...>", "the files to compile")
    .option("-o, --output", "the output file")
    .action(async (files: string[], opts: { output?: string }) => {
        if (files.length === 1) files = globSync(files, { cwd: process.cwd() });

        for (const file of files) {
            const abspath = path.join(process.cwd(), file);
            const source = await readFile(abspath, { encoding: "utf-8" });
            let output: string;

            try {
                output = transpileString(source, abspath, nodeFsProvider);
            } catch (e) {
                if (e instanceof LexingError || e instanceof ParsingError || e instanceof TranspilingError) {
                    const formatter = new ErrorFormatter(e);

                    console.error(formatter.format(source, file));
                    process.exit(1);
                }

                throw e;
            }

            if (opts.output) await writeFile(path.join(process.cwd(), opts.output), output);
            else {
                const filename = path.basename(abspath, path.extname(abspath));
                await writeFile(path.join(path.dirname(abspath), filename + ".js"), output);
            }
        }
    });

program.parse();

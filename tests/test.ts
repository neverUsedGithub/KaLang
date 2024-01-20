import { readFile, writeFile } from "fs/promises";
import { Lexer } from "../src/lexer";
import { Parser } from "../src/parser";
import { Transpiler } from "../src/transpiler";

async function main() {
    const inputFile = "tests/hello-world.ka";
    const lexer = new Lexer(await readFile(inputFile, { encoding: "utf-8" }));
    const tokens = lexer.lexAll();

    const parser = new Parser(tokens);
    const ast = parser.parse();

    const transpiler = new Transpiler(ast);
    const output = transpiler.transpile();

    console.log(output);

    writeFile(inputFile.substring(0, inputFile.length - 3) + ".js", output);
}

main();

import { Lexer } from "./lexer";
import { Parser } from "./parser";
import { Transpiler } from "./transpiler";

export function transpileString(source: string): string {
    const tokens = new Lexer(source).lexAll();
    const ast = new Parser(tokens).parse();

    return new Transpiler(ast).transpile();
}

export async function transpileFile(filename: string): Promise<string> {
    const { readFile } = await import("fs/promises");
    const source = await readFile(filename, { encoding: "utf-8" });
    const tokens = new Lexer(source).lexAll();
    const ast = new Parser(tokens).parse();

    return new Transpiler(ast).transpile();
}

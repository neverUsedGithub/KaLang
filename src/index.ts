import { ErrorFormatter } from "./error";
import { Lexer, LexingError } from "./lexer";
import { Parser, ParsingError } from "./parser";
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

export function formatError(error: LexingError | ParsingError, source: string, filename: string = "<main>") {
    return new ErrorFormatter(error).format(source, filename);
}

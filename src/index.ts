import { ErrorFormatter } from "./error";
import { Lexer, LexingError } from "./lexer";
import { Parser, ParsingError } from "./parser";
import { FsProvider, Transpiler } from "./transpiler";

export function transpileString(source: string, path?: string, fsProvider?: FsProvider): string {
    const tokens = new Lexer(source).lexAll();
    const ast = new Parser(tokens).parse();

    return new Transpiler(ast, path ?? "<main>", fsProvider ?? null).transpile();
}

export async function transpileFile(path: string): Promise<string> {
    const { readFileSync, existsSync } = await import("fs");
    const source = readFileSync(path, { encoding: "utf-8" });
    const tokens = new Lexer(source).lexAll();
    const ast = new Parser(tokens).parse();

    return new Transpiler(ast, path, {
        exists: existsSync,
    }).transpile();
}

export function formatError(error: LexingError | ParsingError, source: string, filename: string = "<main>") {
    return new ErrorFormatter(error).format(source, filename);
}

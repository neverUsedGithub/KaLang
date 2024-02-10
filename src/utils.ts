import { Scope as VisitorScope } from "./visitor";
import { Position, Span, Token } from "./lexer";
import { ParserNode } from "./parser";

type Prettifyable = ParserNode | Token | Span | Position | string | VisitorScope;

export function prettifyAST(ast: Prettifyable | Prettifyable[], level: number = 0): string {
    if (typeof ast === "string") return `"${ast}"`;
    if (ast instanceof Token) return `Token(${ast.type}, "${ast.value}", ${prettifyAST(ast.span)})`;
    if (ast instanceof Span) return `Span(${prettifyAST(ast.start)}, ${prettifyAST(ast.end)})`;
    if (ast instanceof Position) return `Position(${ast.line}, ${ast.col})`;
    if (ast instanceof VisitorScope)
        return `VisitorScope(symbols=${ast.list().map(v => v.name).join(", ")})`;
    if (Array.isArray(ast)) {
        let str = "[\n";
        for (const item of ast) {
            str += `${"  ".repeat(level + 1)}${prettifyAST(item, level + 1)},\n`;
        }
        str += `${"  ".repeat(level)}]`;

        return str;
    }

    let str = "{\n";
    for (const key in ast) {
        str += `${"  ".repeat(level + 1)}${key}: ${prettifyAST(ast[key as keyof typeof ast], level + 1)},\n`;
    }
    str += `${"  ".repeat(level)}}`;

    return str;
}

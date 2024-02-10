import { LexingError, Span } from "./lexer";
import { ParsingError } from "./parser";

export class ErrorFormatter {
    constructor(private error: LexingError | ParsingError) {}

    format(source: string, filename: string): string {
        let span: Span;
        let errorType: string;

        if (this.error instanceof LexingError) {
            span = new Span(this.error.pos, this.error.pos);
            errorType = "Lexer";
        } else {
            span = this.error.span;
            errorType = "Parser";
        }

        const lines = source.replaceAll("\r\n", "\n").split("\n");

        let out = "";
        const maxLineLength = (span.end.line + 1).toString().length;

        const sanitizedReason = this.error.reason.replaceAll("\n", "\\n").replaceAll("\r", "\\r");

        out += ` ${" ".repeat(maxLineLength)}─┬─> ${errorType}Error at ${filename}:${span.start.line + 1}:${
            span.start.col + 1
        }\n`;
        out += ` ${" ".repeat(maxLineLength)} │\n`;

        if (span.end.line - span.start.line <= 4)
            for (let i = span.start.line; i <= span.end.line; i++) {
                out += ` ${(i + 1).toString().padStart(maxLineLength)} │ ${lines[i]}\n`;

                out += ` ${" ".repeat(maxLineLength)} │ `;
                if (i === span.start.line && i === span.end.line) {
                    out += `${" ".repeat(span.start.col)}`;
                    out += `${"^".repeat(span.end.col - span.start.col + 1)}`;
                    out += "\n";
                } else if (i === span.start.line) {
                    out += `${" ".repeat(span.start.col)}`;
                    out += `${"^".repeat(lines[i].length - span.start.col)}`;
                    out += "\n";
                } else if (i >= span.start.line && i < span.end.line) {
                    out += "^".repeat(lines[i].length) + "\n";
                } else {
                    out += "^".repeat(span.end.col + 1) + "\n";
                }
            }
        else {
            out += ` ${(span.start.line + 1).toString().padStart(maxLineLength)} │ ${lines[span.start.line]}\n`;
            out += ` ${" ".repeat(maxLineLength)} │ `;
            out += `${" ".repeat(span.start.col)}`;
            out += `${"^".repeat(lines[span.start.line].length - span.start.col)}`;
            out += "\n";

            out += ` ${" ".repeat(maxLineLength)} .\n`;
            out += ` ${" ".repeat(maxLineLength)} .\n`;

            out += ` ${" ".repeat(maxLineLength)} │\n`;
            out += ` ${(span.end.line + 1).toString().padStart(maxLineLength)} │ ${lines[span.end.line]}\n`;
            out += ` ${" ".repeat(maxLineLength)} │ `;
            out += "^".repeat(span.end.col + 1) + "\n";
        }

        out += ` ${" ".repeat(maxLineLength)} └──> ${sanitizedReason}`;

        return out;
    }
}

const KEYWORDS = [
    "with",
    "do",
    "end",
    "if",
    "else",
    "then",
    "for",
    "in",
    "function",
    "while",
    "return",
    "class",
    "extern",
    "local"
];
const SKIP = " \t\r\n";

export enum TokenType {
    EOF = "EOF",
    STRING = "STRING",
    NUMBER = "NUMBER",
    KEYWORD = "KEYWORD",
    IDENTIFIER = "IDENTIFIER",
    DELIMITER = "DELIMITER",
    OPERATOR = "OPERATOR",
    EQUALS = "EQUALS",
}

export const OPERATORS = ["+", "-", "*", "/", "%", "==", "!=", "<=", ">=", "<", ">", "&&", "||", "..", "."] as const;

const OPERATOR_DISPLAY: { [text: string]: (typeof OPERATORS)[number] } = {
    "+": "+",
    "-": "-",
    "*": "*",
    "/": "/",
    "%": "%",
    "==": "==",
    "!=": "!=",
    "<=": "<=",
    ">=": ">=",
    "<": "<",
    ">": ">",
    and: "&&",
    or: "||",
    "..": "..",
    ".": "."
};

const SINGLE_TOKENS = {
    ",": TokenType.DELIMITER,
    "(": TokenType.DELIMITER,
    ")": TokenType.DELIMITER,
    "[": TokenType.DELIMITER,
    "]": TokenType.DELIMITER,
    "{": TokenType.DELIMITER,
    "}": TokenType.DELIMITER,
    ":": TokenType.DELIMITER,
    "=": TokenType.EQUALS,
} as const;

export class Token {
    constructor(public type: TokenType, public value: string, public span: Span) {}
}

export class Position {
    constructor(public index: number, public line: number, public col: number) {}
}

export class Span {
    constructor(public start: Position, public end: Position) {}
}

export class LexingError extends Error {
    constructor(public reason: string, public pos: Position) {
        super(reason);
    }
}

const NUMBER_REGEX = /[0-9]/;
const IDENTIFIER_START_REGEX = /[a-zA-Z_]/;
const IDENTIFIER_REST_REGEX = /[a-zA-Z_0-9]/;

export class Lexer {
    private pos: number = 0;

    private line: number = 0;
    private lineStart: number = 0;

    constructor(private content: string) {}

    public lexAll(): Token[] {
        const tokens: Token[] = [];

        do {
            const tok = this.next();

            tokens.push(tok);
        } while (tokens[tokens.length - 1].type !== TokenType.EOF);

        return tokens;
    }

    public next(): Token {
        while (this.pos < this.content.length && SKIP.includes(this.content[this.pos])) {
            this.advance();
        }

        if (this.pos < this.content.length && this.content[this.pos] === "#") {
            while (this.pos < this.content.length && this.content[this.pos] !== "\n") this.advance();
            this.advance();

            return this.next();
        }

        if (this.pos >= this.content.length)
            return new Token(TokenType.EOF, "", new Span(this.getPosition(), this.getPosition()));

        for (const operator in OPERATOR_DISPLAY) {
            const start = this.getPosition();
            let end = start;

            if (this.pos + operator.length >= this.content.length) continue;
            if (this.content.substring(this.pos, this.pos + operator.length) !== operator) continue;
            for (let i = 0; i < operator.length; i++) {
                end = this.getPosition();
                this.advance();
            }

            return new Token(TokenType.OPERATOR, OPERATOR_DISPLAY[operator], new Span(start, end));
        }

        if (this.content[this.pos] in SINGLE_TOKENS) {
            const type = SINGLE_TOKENS[this.content[this.pos] as keyof typeof SINGLE_TOKENS];
            const pos = this.getPosition();
            this.advance();

            return new Token(type, this.content[this.pos - 1], new Span(pos, pos));
        }

        if (NUMBER_REGEX.test(this.content[this.pos])) {
            const start = this.getPosition();
            let number = this.content[this.pos];
            let end = start;
            this.advance();

            while (this.pos < this.content.length && NUMBER_REGEX.test(this.content[this.pos])) {
                number += this.content[this.pos];
                end = this.getPosition();
                this.advance();
            }

            return new Token(TokenType.NUMBER, number, new Span(start, end));
        }

        if (this.content[this.pos] === '"' || this.content[this.pos] === "'") {
            const opener = this.content[this.pos];
            const start = this.getPosition();
            let content = "";
            let end = start;
            this.advance();

            while (true) {
                if (this.pos >= this.content.length) {
                    throw this.raiseError(`unclosed string literal`, this.getPosition());
                }

                if (this.content[this.pos] === "\\") {
                    if (this.pos + 1 >= this.content.length) {
                        throw this.raiseError(`expected escape code after \\`, this.getPosition());
                    }

                    this.advance();

                    switch (this.content[this.pos]) {
                        case "'":
                        case '"':
                            content += this.content[this.pos];
                            break;

                        case "n":
                            content += "\n";
                            break;

                        case "r":
                            content += "\r";
                            break;

                        case "b":
                            content += "\b";
                            break;

                        default:
                            throw this.raiseError(
                                `unknown escape code '\\${this.content[this.pos]}'`,
                                this.getPosition(),
                                2
                            );
                    }
                } else if (this.content[this.pos] === opener) {
                    end = this.getPosition();
                    this.advance();
                    break;
                } else {
                    content += this.content[this.pos];
                    this.advance();
                }
            }

            return new Token(TokenType.STRING, content, new Span(start, end));
        }

        if (IDENTIFIER_START_REGEX.test(this.content[this.pos])) {
            const start = this.getPosition();
            let identifier = this.content[this.pos];
            let end = start;
            this.advance();

            while (this.pos < this.content.length && IDENTIFIER_REST_REGEX.test(this.content[this.pos])) {
                identifier += this.content[this.pos];
                end = this.getPosition();
                this.advance();
            }

            return new Token(
                KEYWORDS.includes(identifier) ? TokenType.KEYWORD : TokenType.IDENTIFIER,
                identifier,
                new Span(start, end)
            );
        }

        throw this.raiseError(`unexpected character '${this.content[this.pos]}'`, this.getPosition());
    }

    private raiseError(message: string, pos: Position, length: number = 1) {
        const err = new LexingError(message, pos);
        for (let i = 0; i < length; i++) this.advance();

        return err;
    }

    private advance() {
        if (this.content[this.pos] === "\n") {
            this.line++;
            this.lineStart = this.pos + 1;
        }

        this.pos++;
    }

    private getPosition() {
        return new Position(this.pos, this.line, this.pos - this.lineStart);
    }
}

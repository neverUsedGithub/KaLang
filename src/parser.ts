import { Token, TokenType, Span, OPERATORS, Position } from "./lexer";

const PRECEDENCES: { [K in (typeof OPERATORS)[number] | "." | "fn"]: number } = {
    "+": 1,
    "-": 1,

    "*": 2,
    "/": 2,
    "%": 2,

    "==": 3,
    "!=": 3,
    "<=": 3,
    ">=": 3,
    "<": 3,
    ">": 3,

    "&&": 4,
    "||": 4,

    "..": 5,

    fn: 6,

    ".": 7,
};

export interface BaseNode<T extends string> {
    type: T;
    span: Span;
}

export interface ProgramNode extends BaseNode<"program"> {
    body: ParserNode[];
}

export interface StringNode extends BaseNode<"string"> {
    value: string;
}

export interface BinaryExpressionNode extends BaseNode<"binaryExpression"> {
    left: ParserNode;
    right: ParserNode;
    operator: Token;
}

export interface VariableAccessNode extends BaseNode<"variableAccess"> {
    name: string;
}

export interface PropertyAccessNode extends BaseNode<"propertyAccess"> {
    value: ParserNode;
    property: string;
}

export interface LambdaFunctionNode extends BaseNode<"lambdaFunction"> {
    body: ParserNode;
    parameters: Token[];
}

export interface FunctionCallNode extends BaseNode<"functionCall"> {
    fn: ParserNode;
    arguments: ParserNode[];
}

export interface VariableAssignNode extends BaseNode<"variableAssign"> {
    name: ParserNode;
    value: ParserNode;
    isLocal: boolean;
}

export interface ArrayNode extends BaseNode<"array"> {
    items: ParserNode[];
}

export interface NumberNode extends BaseNode<"number"> {
    value: string;
}

export interface ExpressionStatementNode extends BaseNode<"expressionStatement"> {
    expression: ParserNode;
}

export interface BlockStatementNode extends BaseNode<"blockStatement"> {
    body: ParserNode[];
}

export interface IfStatementNode extends BaseNode<"ifStatement"> {
    condition: ParserNode;
    ifBranch: ParserNode;
    elseBranch: ParserNode | null;
}

export interface ObjectNode extends BaseNode<"object"> {
    fields: Record<string, ParserNode>;
}

export interface ForStatementNode extends BaseNode<"forStatement"> {
    variable: Token;
    iterable: ParserNode;
    body: ParserNode;
}

export interface FunctionDeclarationNode extends BaseNode<"functionDeclaration"> {
    name: string;
    body: ParserNode;
    parameters: string[];
}

export interface WhileStatementNode extends BaseNode<"whileStatement"> {
    condition: ParserNode;
    body: ParserNode;
}

export interface ReturnStatementNode extends BaseNode<"returnStatement"> {
    expression: ParserNode | null;
}

export interface ClassDeclarationNode extends BaseNode<"classDeclaration"> {
    name: string;
    methods: ParserNode[];
}

export interface MethodDeclarationNode extends BaseNode<"methodDeclaration"> {
    name: Token;
    body: ParserNode;
    parameters: string[];
}

export enum ExternVariableType {
    CLASS,
    VARIABLE,
}

export interface ExternDeclarationNode extends BaseNode<"externDeclaration"> {
    name: string;
    varType: ExternVariableType;
}

export type ParserNode =
    | ProgramNode
    | StringNode
    | BinaryExpressionNode
    | VariableAccessNode
    | PropertyAccessNode
    | LambdaFunctionNode
    | FunctionCallNode
    | VariableAssignNode
    | ArrayNode
    | NumberNode
    | ExpressionStatementNode
    | BlockStatementNode
    | IfStatementNode
    | ObjectNode
    | ForStatementNode
    | FunctionDeclarationNode
    | WhileStatementNode
    | ReturnStatementNode
    | ClassDeclarationNode
    | MethodDeclarationNode
    | ExternDeclarationNode;

function isAssignable(expr: ParserNode): boolean {
    if (expr.type === "binaryExpression" && expr.operator.value === ".")
        return isAssignable(expr.left) && isAssignable(expr.right);

    if (expr.type === "variableAccess") return true;

    return false;
}

export class Parser {
    private pos: number = 0;

    constructor(private tokens: Token[]) {}

    public parse() {
        return this.parseProgram();
    }

    private parsePrimary(): ParserNode {
        if (this.is(TokenType.KEYWORD, "do") || this.is(TokenType.KEYWORD, "with")) {
            const parameters: Token[] = [];

            if (this.is(TokenType.KEYWORD, "with")) {
                this.eat(TokenType.KEYWORD, "with");

                do {
                    if (parameters.length > 0) this.eat(TokenType.DELIMITER, ",");
                    parameters.push(this.eat(TokenType.IDENTIFIER));
                } while (!this.is(TokenType.KEYWORD, "do"));
            }

            const start = this.eat(TokenType.KEYWORD, "do").span.start;
            const body: ParserNode[] = [];

            while (!this.is(TokenType.KEYWORD, "end")) {
                body.push(this.parseStatement());
            }

            const end = this.eat(TokenType.KEYWORD, "end").span.end;

            return {
                type: "lambdaFunction",
                body: {
                    type: "blockStatement",
                    body: body,
                    span:
                        body.length > 0
                            ? new Span(body[0].span.start, body[body.length - 1].span.end)
                            : new Span(start, end),
                } satisfies BlockStatementNode,
                parameters,

                span: new Span(start, end),
            } satisfies LambdaFunctionNode;
        }

        if (this.is(TokenType.DELIMITER, "[")) {
            const start = this.eat(TokenType.DELIMITER, "[").span.start;
            const items: ParserNode[] = [];

            while (!this.is(TokenType.DELIMITER, "]")) {
                if (items.length > 0) this.eat(TokenType.DELIMITER, ",");
                items.push(this.parseExpression());
            }

            const end = this.eat(TokenType.DELIMITER, "]").span.end;

            return {
                type: "array",
                items,
                span: new Span(start, end),
            } satisfies ArrayNode;
        }

        if (this.is(TokenType.DELIMITER, "(")) {
            this.eat(TokenType.DELIMITER, "(");
            const body = this.parseExpression();
            this.eat(TokenType.DELIMITER, ")");

            return body;
        }

        if (this.is(TokenType.STRING)) {
            const curr = this.eat(TokenType.STRING);

            return {
                type: "string",
                value: curr.value,
                span: curr.span,
            } satisfies StringNode;
        }

        if (this.is(TokenType.NUMBER)) {
            const curr = this.eat(TokenType.NUMBER);

            return {
                type: "number",
                value: curr.value,
                span: curr.span,
            } satisfies NumberNode;
        }

        if (this.is(TokenType.IDENTIFIER)) {
            const ident = this.eat(TokenType.IDENTIFIER);
            return {
                type: "variableAccess",
                name: ident.value,
                span: ident.span,
            } satisfies VariableAccessNode;
        }

        if (this.is(TokenType.DELIMITER, "{")) {
            const start = this.eat(TokenType.DELIMITER, "{").span.start;
            const fields: Record<string, ParserNode> = {};

            while (!this.is(TokenType.DELIMITER, "}")) {
                if (Object.keys(fields).length > 0) this.eat(TokenType.DELIMITER, ",");

                let field: string;

                if (this.is(TokenType.IDENTIFIER)) field = this.eat(TokenType.IDENTIFIER).value;
                else field = this.eat(TokenType.STRING).value;

                this.eat(TokenType.DELIMITER, ":");

                fields[field] = this.parseExpression();
            }

            const end = this.eat(TokenType.DELIMITER, "}").span.end;

            return {
                type: "object",
                fields,

                span: new Span(start, end),
            } satisfies ObjectNode;
        }

        throw new ParsingError("expected an expression", this.tokens[this.pos].span);
    }

    private parseExpressionInner(lhs: ParserNode, minPrecedence: number) {
        while (
            (this.is(TokenType.OPERATOR) &&
                this.tokens[this.pos].value in PRECEDENCES &&
                PRECEDENCES[this.tokens[this.pos].value as keyof typeof PRECEDENCES] >= minPrecedence) ||
            (this.is(TokenType.DELIMITER, "(") && PRECEDENCES["fn"] >= minPrecedence)
        ) {
            if (this.is(TokenType.DELIMITER, "(")) {
                this.eat(TokenType.DELIMITER, "(");

                const args: ParserNode[] = [];

                while (!this.is(TokenType.DELIMITER, ")")) {
                    if (args.length > 0) this.eat(TokenType.DELIMITER, ",");
                    args.push(this.parseExpression());
                }

                const end = this.eat(TokenType.DELIMITER, ")").span.end;

                lhs = {
                    type: "functionCall",
                    fn: lhs,
                    arguments: args,
                    span: new Span(lhs.span.start, end),
                } satisfies FunctionCallNode;

                continue;
            } else {
                const op = this.eat(TokenType.OPERATOR);
                const prec = PRECEDENCES[op.value as keyof typeof PRECEDENCES];
                let rhs: ParserNode = this.parsePrimary();

                while (
                    (this.is(TokenType.OPERATOR) &&
                        this.tokens[this.pos].value in PRECEDENCES &&
                        PRECEDENCES[this.tokens[this.pos].value as keyof typeof PRECEDENCES] > prec) ||
                    (this.is(TokenType.DELIMITER, "(") && PRECEDENCES["fn"] > prec)
                ) {
                    rhs = this.parseExpressionInner(rhs, prec + 1);
                }

                lhs = {
                    type: "binaryExpression",
                    left: lhs,
                    right: rhs,
                    operator: op,
                    span: new Span(lhs.span.start, rhs.span.end),
                } satisfies BinaryExpressionNode;
            }
        }

        return lhs;
    }

    private parseExpression(): ParserNode {
        const expr = this.parseExpressionInner(this.parsePrimary(), 0);

        if (this.is(TokenType.EQUALS) && isAssignable(expr)) {
            this.eat(TokenType.EQUALS);

            const value = this.parseExpression();

            return {
                type: "variableAssign",
                name: expr,
                value,
                isLocal: false,

                span: new Span(expr.span.start, value.span.end),
            } satisfies VariableAssignNode;
        }

        return expr;
    }

    private parseLocalStatement(): ParserNode {
        const start = this.eat(TokenType.KEYWORD, "local").span.start;
        const name = this.parseExpression();

        if (name.type !== "variableAssign")
            throw new ParsingError("expected variable assignment after keyword local", name.span);

        return {
            ...name,
            isLocal: true,
        } satisfies VariableAssignNode;
    }

    private parseIfStatement(): ParserNode {
        const start = this.eat(TokenType.KEYWORD, "if").span.start;
        const condition = this.parseExpression();

        this.eat(TokenType.KEYWORD, "then");

        const ifBranch: ParserNode[] = [];
        while (!this.is(TokenType.KEYWORD, "end") && !this.is(TokenType.KEYWORD, "else")) {
            ifBranch.push(this.parseStatement());
        }

        if (this.is(TokenType.KEYWORD, "end")) {
            const end = this.eat(TokenType.KEYWORD, "end").span.end;

            return {
                type: "ifStatement",
                condition,

                ifBranch: {
                    type: "blockStatement",
                    body: ifBranch,
                    span: new Span(start, end),
                } satisfies BlockStatementNode,

                elseBranch: null,

                span: new Span(start, end),
            } satisfies IfStatementNode;
        }

        let ifBranchEnd = this.eat(TokenType.KEYWORD, "else").span.end;
        let elseBranch: ParserNode;

        if (this.is(TokenType.KEYWORD, "if")) {
            elseBranch = this.parseIfStatement();
        } else {
            const body: ParserNode[] = [];

            while (!this.is(TokenType.KEYWORD, "end")) {
                body.push(this.parseStatement());
            }

            const end = this.eat(TokenType.KEYWORD, "end").span.end;

            elseBranch = {
                type: "blockStatement",
                body: body,

                span: new Span(ifBranchEnd, end),
            } satisfies BlockStatementNode;
        }

        return {
            type: "ifStatement",
            condition,

            ifBranch: {
                type: "blockStatement",
                body: ifBranch,
                span:
                    ifBranch.length > 0
                        ? new Span(ifBranch[0].span.start, ifBranch[ifBranch.length - 1].span.end)
                        : new Span(start, ifBranchEnd),
            },

            elseBranch: elseBranch,

            span: new Span(start, elseBranch.span.end),
        } satisfies IfStatementNode;
    }

    private parseForStatement() {
        const start = this.eat(TokenType.KEYWORD, "for").span.start;
        const ident = this.eat(TokenType.IDENTIFIER);
        this.eat(TokenType.KEYWORD, "in");
        const value = this.parseExpression();
        this.eat(TokenType.KEYWORD, "do");

        const body: ParserNode[] = [];

        while (!this.is(TokenType.KEYWORD, "end")) {
            body.push(this.parseStatement());
        }

        const end = this.eat(TokenType.KEYWORD, "end").span.end;

        return {
            type: "forStatement",
            iterable: value,
            variable: ident,
            body: {
                type: "blockStatement",
                body,

                span:
                    body.length > 0
                        ? new Span(body[0].span.start, body[body.length - 1].span.end)
                        : new Span(start, end),
            } satisfies BlockStatementNode,

            span: new Span(start, end),
        } satisfies ForStatementNode;
    }

    private parseFunctionDeclaratino() {
        const start = this.eat(TokenType.KEYWORD, "function").span.start;
        const name = this.eat(TokenType.IDENTIFIER).value;
        const parameters: string[] = [];
        const body: ParserNode[] = [];

        if (this.is(TokenType.DELIMITER, "(")) {
            this.eat(TokenType.DELIMITER, "(");
            while (!this.is(TokenType.DELIMITER, ")")) {
                parameters.push(this.eat(TokenType.IDENTIFIER).value);
            }
            this.eat(TokenType.DELIMITER, ")");
        }

        this.eat(TokenType.KEYWORD, "do");

        while (!this.is(TokenType.KEYWORD, "end")) {
            body.push(this.parseStatement());
        }

        const end = this.eat(TokenType.KEYWORD, "end").span.end;

        return {
            type: "functionDeclaration",
            name,
            parameters,
            body: {
                type: "blockStatement",
                body,

                span:
                    body.length > 0
                        ? new Span(body[0].span.start, body[body.length - 1].span.end)
                        : new Span(start, end),
            },

            span: new Span(start, end),
        } satisfies FunctionDeclarationNode;
    }

    private parseWhileStatement() {
        const start = this.eat(TokenType.KEYWORD, "while").span.start;
        const condition = this.parseExpression();
        const body: ParserNode[] = [];

        this.eat(TokenType.KEYWORD, "do");
        while (!this.is(TokenType.KEYWORD, "end")) {
            body.push(this.parseStatement());
        }

        const end = this.eat(TokenType.KEYWORD, "end").span.end;

        return {
            type: "whileStatement",
            condition,
            body: {
                type: "blockStatement",
                body,

                span:
                    body.length > 0
                        ? new Span(body[0].span.start, body[body.length - 1].span.end)
                        : new Span(start, end),
            },

            span: new Span(start, end),
        } satisfies WhileStatementNode;
    }

    private parseReturnStatement(): ReturnStatementNode {
        const start = this.eat(TokenType.KEYWORD, "return").span;
        let expr: ParserNode | null = null;

        if (!this.is(TokenType.KEYWORD, "end")) expr = this.parseExpression();

        return {
            type: "returnStatement",
            expression: expr,

            span: new Span(start.start, expr ? expr.span.end : start.end),
        };
    }

    private parseMethodDeclaration() {
        const methodName = this.is(TokenType.OPERATOR) ? this.eat(TokenType.OPERATOR) : this.eat(TokenType.IDENTIFIER);
        const params: string[] = [];
        const body: ParserNode[] = [];

        this.eat(TokenType.DELIMITER, "(");

        while (!this.is(TokenType.DELIMITER, ")")) {
            if (params.length > 0) this.eat(TokenType.DELIMITER, ",");
            params.push(this.eat(TokenType.IDENTIFIER).value);
        }

        this.eat(TokenType.DELIMITER, ")");
        const bodyStart = this.eat(TokenType.KEYWORD, "do").span.start;

        while (!this.is(TokenType.KEYWORD, "end")) {
            body.push(this.parseStatement());
        }

        const end = this.eat(TokenType.KEYWORD, "end");

        return {
            type: "methodDeclaration",
            name: methodName,
            parameters: params,
            body: {
                type: "blockStatement",
                body,
                span: new Span(bodyStart, end.span.end),
            },

            span: new Span(methodName.span.start, end.span.end),
        } satisfies MethodDeclarationNode;
    }

    private parseClassDeclaration() {
        const start = this.eat(TokenType.KEYWORD, "class").span.start;
        const name = this.eat(TokenType.IDENTIFIER).value;
        const methods: MethodDeclarationNode[] = [];
        this.eat(TokenType.KEYWORD, "do");

        while (!this.is(TokenType.KEYWORD, "end")) {
            methods.push(this.parseMethodDeclaration());
        }

        const end = this.eat(TokenType.KEYWORD, "end").span.end;

        return {
            type: "classDeclaration",
            name,
            methods,

            span: new Span(start, end),
        } satisfies ClassDeclarationNode;
    }

    private parseExternDeclaration() {
        const start = this.eat(TokenType.KEYWORD, "extern").span.start;
        let type = ExternVariableType.VARIABLE;
        let name: Token;

        if (this.is(TokenType.KEYWORD, "class")) {
            this.eat(TokenType.KEYWORD, "class");
            type = ExternVariableType.CLASS;
            name = this.eat(TokenType.IDENTIFIER);
        } else {
            name = this.eat(TokenType.IDENTIFIER);
        }

        return {
            type: "externDeclaration",
            name: name.value,
            varType: type,

            span: new Span(start, name.span.end),
        } satisfies ExternDeclarationNode;
    }

    private parseStatement() {
        if (this.is(TokenType.KEYWORD, "if")) {
            return this.parseIfStatement();
        }

        if (this.is(TokenType.KEYWORD, "for")) {
            return this.parseForStatement();
        }

        if (this.is(TokenType.KEYWORD, "function")) {
            return this.parseFunctionDeclaratino();
        }

        if (this.is(TokenType.KEYWORD, "while")) {
            return this.parseWhileStatement();
        }

        if (this.is(TokenType.KEYWORD, "return")) {
            return this.parseReturnStatement();
        }

        if (this.is(TokenType.KEYWORD, "class")) {
            return this.parseClassDeclaration();
        }

        if (this.is(TokenType.KEYWORD, "extern")) {
            return this.parseExternDeclaration();
        }

        if (this.is(TokenType.KEYWORD, "local")) {
            return this.parseLocalStatement();
        }

        const expr = this.parseExpression();

        return {
            type: "expressionStatement",
            expression: expr,
            span: expr.span,
        } satisfies ExpressionStatementNode;
    }

    private parseProgram(): ProgramNode {
        const body: ParserNode[] = [];
        let end = this.tokens[0].span.end;

        while (!this.is(TokenType.EOF)) {
            body.push(this.parseStatement());
        }

        if (body.length > 0) end = body[body.length - 1].span.end;

        return {
            type: "program",
            body,
            span: new Span(new Position(0, 0, 0), end),
        };
    }

    private is(type: TokenType, value?: string) {
        if (this.tokens[this.pos].type === type) if (!value || this.tokens[this.pos].value === value) return true;
        return false;
    }

    private eat(type: TokenType, value?: string) {
        if (this.is(type, value)) return this.tokens[this.pos++];

        const tok = this.tokens[this.pos];

        if (!value) throw new ParsingError(`unexpected token ${tok.type}, expected ${type}`, tok.span);

        throw new ParsingError(`unexpected token ${tok.type}, expected '${value}' (${type})`, tok.span);
    }
}

export class ParsingError extends Error {
    constructor(public reason: string, public span: Span) {
        super(reason);
    }
}

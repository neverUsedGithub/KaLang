import { ParserNode } from "./parser";
import { Span, Position } from "./lexer";

type ScopeVariableMetadata = { definedAt: Position; type: "variable" };
type ScopeFunctionMetadata = { definedAt: Position; type: "function" };

export class Scope {
    private variables: Map<string, ScopeVariableMetadata> = new Map();
    private functions: Map<string, ScopeFunctionMetadata> = new Map();

    constructor(public parent: Scope | null = null) {}

    addVariable(name: string, definedAt: Position) {
        if (!this.variables.has(name)) this.variables.set(name, { definedAt, type: "variable" });
    }

    addFunction(name: string, definedAt: Position) {
        if (!this.functions.has(name)) this.functions.set(name, { definedAt, type: "function" });
    }

    listVariables(): [string, ScopeVariableMetadata][] {
        const vars = [...this.variables.entries()];

        if (!this.parent) return vars;
        return [...vars, ...this.parent.listVariables()];
    }

    listFunctions(): [string, ScopeFunctionMetadata][] {
        const functs = [...this.functions.entries()];

        if (!this.parent) return functs;
        return [...functs, ...this.parent.listFunctions()];
    }
}

export class ASTVisitor {
    private indentLevel: number = 0;
    private currentScope: Scope = new Scope();
    public span2Scope: [Span, Scope][] = [];

    constructor(private root: ParserNode) {}

    public run(): void {
        return this.visit(this.root);
    }

    public getNodeAtIndex(index: number): Scope | null {
        for (let i = this.span2Scope.length - 1; i >= 0; i--) {
            const item = this.span2Scope[i];

            if (index >= item[0].start.index && index <= item[0].end.index) {
                return item[1];
            }
        }

        return null;
    }

    public getNodeAtPos(line: number, col: number): Scope | null {
        for (let i = this.span2Scope.length - 1; i >= 0; i--) {
            const item = this.span2Scope[i];

            if (
                line >= item[0].start.line &&
                col >= item[0].start.col &&
                line <= item[0].end.line &&
                col <= item[0].end.col
            ) {
                return item[1];
            }
        }

        return null;
    }

    private visit(node: ParserNode): void {
        this.span2Scope.push([node.span, this.currentScope]);

        switch (node.type) {
            case "array":
                node.items.map((item) => this.visit(item));
                return;

            case "binaryExpression":
                this.visit(node.left);
                this.visit(node.right);
                return;

            case "functionCall":
                this.visit(node.fn);
                node.arguments.map((arg) => this.visit(arg));
                return;

            case "lambdaFunction": {
                this.visit(node.body);
                return;
            }

            case "number":
                return;

            case "propertyAccess":
                this.visit(node.value);
                return;

            case "string":
                return;

            case "variableAccess":
                return;

            case "variableAssign":
                if (node.name.type === "variableAccess") this.currentScope.addVariable(node.name.name, node.span.start);

                this.visit(node.name);
                this.visit(node.value);
                return;

            case "expressionStatement":
                this.visit(node.expression);
                return;

            case "blockStatement": {
                this.currentScope = new Scope(this.currentScope);

                node.body.map((node) => this.visit(node));

                this.currentScope = this.currentScope.parent!;
                return;
            }

            case "ifStatement": {
                this.visit(node.condition);
                this.visit(node.ifBranch);

                if (node.elseBranch) this.visit(node.elseBranch);

                return;
            }

            case "object": {
                for (const field in node.fields) {
                    this.visit(node.fields[field]);
                }
                return;
            }

            case "forStatement":
                this.currentScope.addVariable(node.variable.value, node.span.start);
                this.visit(node.iterable);
                this.visit(node.body);
                return;

            case "whileStatement":
                this.visit(node.body);
                return;

            case "functionDeclaration":
                this.currentScope.addFunction(node.name, node.span.start);
                this.visit(node.body);

                return;

            case "returnStatement":
                this.visit(node.expression);
                return;

            case "program": {
                node.body.map((node) => this.visit(node));
                return;
            }

            default:
                node satisfies never;
                throw new Error(`cannot transpile node ${(node as any).type}: unimplemented`);
        }
    }
}

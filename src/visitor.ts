import { ExternVariableType, ParserNode } from "./parser";
import { Span, Position } from "./lexer";

export type ScopeSymbolMetadata = { definedAt: Position; type: "variable" | "function" | "class" };
export type ScopeSymbol = { name: string; meta: ScopeSymbolMetadata };

export class Scope {
    private symbols: Map<string, ScopeSymbolMetadata> = new Map();

    constructor(public parent: Scope | null = null) {}

    addSymbol(type: ScopeSymbolMetadata["type"], name: string, definedAt: Position, isLocal: boolean = false) {
        if (isLocal || !this.symbols.has(name)) this.symbols.set(name, { definedAt, type });
    }

    list(): ScopeSymbol[] {
        const parentSymbols = this.parent ? this.parent.list() : [];
        return [...parentSymbols, ...Array.from(this.symbols.entries()).map((s) => ({ name: s[0], meta: s[1] }))];
    }
}

export class ASTVisitor {
    private indentLevel: number = 0;
    private currentScope: Scope = new Scope();
    public externVariables: Map<string, ExternVariableType> = new Map();
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
                if (node.name.type === "variableAccess")
                    if (!this.externVariables.has(node.name.name))
                        this.currentScope.addSymbol("variable", node.name.name, node.span.start, node.isLocal);

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
                if (!this.externVariables.has(node.variable.value))
                    this.currentScope.addSymbol("variable", node.variable.value, node.span.start);

                this.visit(node.iterable);
                this.visit(node.body);
                return;

            case "whileStatement":
                this.visit(node.body);
                return;

            case "functionDeclaration":
                this.currentScope.addSymbol("function", node.name, node.span.start);
                this.visit(node.body);

                return;

            case "returnStatement":
                if (node.expression) this.visit(node.expression);
                return;

            case "classDeclaration":
                this.currentScope.addSymbol("class", node.name, node.span.start);
                for (const md of node.methods) this.visit(md);
                return;

            case "externDeclaration":
                this.externVariables.set(node.name, node.varType);
                return;

            case "methodDeclaration":
                this.visit(node.body);
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

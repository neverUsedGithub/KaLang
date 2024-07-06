import { ASSIGNMENT_OPERATORS, OPERATORS, Span, TokenType, UNARY_OPERATORS } from "./lexer";
import { ExternVariableType, ImportStatementNode, ImportType, ParserNode } from "./parser";

const BUILTIN_OPERATORS = "__kaOperators";
const BUILTIN_RANGE = "__kaGetRange";

function getIndent(level: number) {
    return "    ".repeat(level);
}

interface VariableMetadata {
    isExport: boolean;
}

export class TranspilingError extends Error {
    constructor(public reason: string, public span: Span) {
        super(reason);
    }
}

export class Scope {
    private variables: Map<string, VariableMetadata> = new Map();

    constructor(private parent: Scope | null = null) {}

    has(name: string): boolean {
        return this.variables.has(name) || (this.parent ? this.parent.has(name) : false);
    }

    add(name: string, meta: VariableMetadata, isLocal: boolean = false) {
        if (!isLocal && this.has(name)) return;
        this.variables.set(name, meta);
    }

    get(name: string) {
        return this.variables.get(name);
    }

    list() {
        return Array.from(this.variables.entries()).map((v) => ({ name: v[0], meta: v[1] }));
    }
}

function getVariableName(expr: ParserNode): string {
    if (expr.type === "binaryExpression") return getVariableName(expr.left) + "." + getVariableName(expr.right);
    if (expr.type === "variableAccess") return expr.name;

    throw new Error("getVariableName called on invalid node");
}

// Portable to web
export interface FsProvider {
    exists(path: string): boolean;
}

function joinPaths(...paths: string[]): string {
    let joined = "";

    for (let path of paths) {
        if (joined.length !== 0) joined += "/";

        while (path.startsWith("/")) path = path.substring(1);
        while (path.endsWith("/")) path = path.substring(0, path.length - 1);
        joined += path;
    }

    return joined;
}

function dirname(path: string) {
    return path.substring(0, path.lastIndexOf("/"));
}

function resolveImportStatement(path: string, node: ImportStatementNode, fs: FsProvider | null): string {
    if (!fs) throw new TranspilingError("cannot use import statement without an fs provider", node.span);
    path = path.replaceAll("\\", "/");

    const joinedPath = node.source.map((tok) => tok.value).join("/");
    const modulePath = joinPaths(dirname(path), joinedPath);

    if (fs.exists(modulePath + ".ka")) return "./" + joinedPath + ".js";

    return joinedPath;
}

export class Transpiler {
    private indentLevel: number = 0;
    private currentScope: Scope = new Scope();
    private externVariables: Map<string, ExternVariableType> = new Map();

    constructor(private root: ParserNode, private file: string, private fs: FsProvider | null) {}

    public transpile(): string {
        return this.visit(this.root);
    }

    private visitJoined(nodes: ParserNode[], separator: string) {
        return nodes
            .map((node) => this.visit(node))
            .filter((str) => str.length !== 0)
            .join(separator);
    }

    private visit(node: ParserNode): string {
        switch (node.type) {
            case "array": {
                const out = node.items.map((item) => this.visit(item));
                const length = out.reduce((a, v) => a + v.length, 0);

                if (length <= 10) return `[ ${out.join(", ")} ]`;

                return `[\n${out.map((line) => getIndent(this.indentLevel + 1) + line).join(",\n")}\n${getIndent(
                    this.indentLevel
                )}]`;
            }

            case "binaryExpression":
                // '.' is not overloadable
                if (node.operator.value === ".") {
                    if (node.right.type === "variableAccess")
                        return `${this.visit(node.left)}.${this.visit(node.right)}`;
                    return `${this.visit(node.left)}[${this.visit(node.right)}]`;
                }

                return `${BUILTIN_OPERATORS}["${node.operator.value}"](${this.visit(node.left)}, ${this.visit(
                    node.right
                )})`;

            case "functionCall":
                return `${this.visit(node.fn)}(${this.visitJoined(node.arguments, ", ")})`;

            case "lambdaFunction": {
                const prev = this.currentScope;
                this.currentScope = new Scope(prev);
                for (const param of node.parameters) this.currentScope.add(param.value, { isExport: false }, true);

                this.indentLevel++;
                const out = `function(${node.parameters.map((tok) => tok.value).join(", ")}) {\n${this.visit(
                    node.body
                )}\n${getIndent(this.indentLevel - 1)}}`;
                this.indentLevel--;

                this.currentScope = prev;

                return out;
            }

            case "number":
                return node.value;

            case "propertyAccess":
                return `${this.visit(node.value)}.${node.property}`;

            case "string":
                return `\`${node.value.replaceAll("`", "\\`")}\``;

            case "variableAccess":
                return node.name;

            case "variableAssign":
                if (node.name.type === "variableAccess")
                    if (node.isLocal || !this.externVariables.has(node.name.name))
                        this.currentScope.add(node.name.name, { isExport: false }, node.isLocal);

                if (node.operator === "=") return `${getVariableName(node.name)} = ${this.visit(node.value)}`;

                return `${getVariableName(node.name)} = ${BUILTIN_OPERATORS}["${node.operator}"](${getVariableName(
                    node.name
                )}, ${this.visit(node.value)})`;

            case "expressionStatement":
                return `${getIndent(this.indentLevel)}${this.visit(node.expression)};`;

            case "blockStatement": {
                const previous = this.currentScope;
                this.currentScope = new Scope(this.currentScope);

                const out = this.visitJoined(node.body, "\n");

                let vars = "";
                for (const variable of this.currentScope.list()) {
                    if (variable.meta.isExport) continue;
                    vars += `${getIndent(this.indentLevel)}let ${variable.name};\n`;
                }

                this.currentScope = previous;
                return vars + out;
            }

            case "ifStatement": {
                let out = `${getIndent(this.indentLevel++)}if (${this.visit(node.condition)}) {\n${this.visit(
                    node.ifBranch
                )}\n${getIndent(--this.indentLevel)}}`;

                if (node.elseBranch) {
                    this.indentLevel++;
                    out += ` else {\n${this.visit(node.elseBranch)}\n${getIndent(--this.indentLevel)}}`;
                }

                return out;
            }

            case "object": {
                const fieldKeys = Object.keys(node.fields);
                const sep = fieldKeys.length > 1 ? "\n" : " ";
                const indent = fieldKeys.length > 1 ? getIndent(this.indentLevel + 1) : "";

                let generated = "{" + sep;

                this.indentLevel++;
                for (let i = 0; i < fieldKeys.length; i++) {
                    generated += `${indent}"${fieldKeys[i].replaceAll('"', '\\"')}": ${this.visit(
                        node.fields[fieldKeys[i]]
                    )}`;

                    if (i !== fieldKeys.length - 1) generated += "," + sep;
                }
                this.indentLevel--;

                return generated + sep + "}";
            }

            case "forStatement":
                if (!this.externVariables.has(node.variable.value))
                    this.currentScope.add(node.variable.value, { isExport: false });
                return `${getIndent(this.indentLevel++)}for (${node.variable.value} of ${this.visit(
                    node.iterable
                )}) {\n${this.visit(node.body)}\n${getIndent(--this.indentLevel)}}`;

            case "whileStatement":
                return `${getIndent(this.indentLevel++)}while (${this.visit(node.condition)}) {\n${this.visit(
                    node.body
                )}\n${getIndent(--this.indentLevel)}}`;

            case "functionDeclaration": {
                const prev = this.currentScope;
                this.currentScope = new Scope(prev);
                for (const param of node.parameters) this.currentScope.add(param, { isExport: false }, true);

                const out = `${getIndent(this.indentLevel++)}function ${node.name}(${node.parameters.join(
                    ", "
                )}) {\n${this.visit(node.body)}\n${getIndent(--this.indentLevel)}}`;

                this.currentScope = prev;
                return out;
            }

            case "returnStatement":
                return `${getIndent(this.indentLevel)}return${
                    node.expression ? " " + this.visit(node.expression) : ""
                };`;

            case "methodDeclaration": {
                const prev = this.currentScope;
                this.currentScope = new Scope(prev);
                for (const param of node.parameters) this.currentScope.add(param, { isExport: false }, true);

                const name =
                    node.name.type === TokenType.OPERATOR
                        ? `"${node.name.value}"`
                        : node.name.value === "__init__"
                        ? "constructor"
                        : node.name.value;
                const out = `${getIndent(this.indentLevel++)}${name}(${node.parameters.join(", ")}) {\n${this.visit(
                    node.body
                )}\n${getIndent(--this.indentLevel)}}`;

                this.currentScope = prev;
                return out;
            }

            case "classDeclaration":
                return `${getIndent(this.indentLevel++)}class ${node.name} {\n${node.methods
                    .map((m) => this.visit(m))
                    .join("\n")}\n${getIndent(--this.indentLevel)}}`;

            case "externDeclaration":
                this.externVariables.set(node.name, node.varType);
                return "";

            case "newExpression":
                return `new ${this.visit(node.expr)}`;

            case "fieldDeclaration":
                return `${getIndent(this.indentLevel)}${node.name.value} = ${this.visit(node.value)};`;

            case "breakStatement":
                return `${getIndent(this.indentLevel)}break;`;

            case "continueStatement":
                return `${getIndent(this.indentLevel)}continue;`;

            case "importStatement": {
                const resolved = resolveImportStatement(this.file, node, this.fs);
                const names = node.imports.map((tok) => tok.value).join(", ");

                switch (node.importType) {
                    case ImportType.Module:
                        return `${getIndent(this.indentLevel)}import * as ${names} from "${resolved}";`;

                    case ImportType.Default:
                        return `${getIndent(this.indentLevel)}import ${names} from "${resolved}";`;

                    case ImportType.Specified:
                        return `${getIndent(this.indentLevel)}import { ${names} } from "${resolved}";`;

                    default:
                        node.importType satisfies never;
                        throw new Error("unimplemented import type");
                }
            }

            case "exportStatement": {
                let isVar = false;

                if (node.expression.type === "variableAssign") {
                    if (node.expression.name.type !== "variableAccess")
                        throw new TranspilingError("can't export this type of expression", node.expression.name.span);

                    if (this.currentScope.has(node.expression.name.name))
                        throw new TranspilingError(
                            "can't export a variable after it has already been used",
                            node.expression.span
                        );

                    isVar = true;
                    this.currentScope.add(node.expression.name.name, { isExport: true });
                }
                return `${getIndent(this.indentLevel)}export ${isVar ? "let " : ""}${this.visit(node.expression)};`;
            }

            case "signExpression":
                return `${BUILTIN_OPERATORS}["${node.sign}$"](${this.visit(node.expression)})`;

            case "program": {
                const genBody = this.visitJoined(node.body, "\n");
                let generated = `function ${BUILTIN_RANGE}(start, end) {
    const out = [];
    for (let i = start; i < end; i++) out.push(i);
    return out;
}
const ${BUILTIN_OPERATORS} = {\n`;

                for (const operator of OPERATORS) {
                    if (operator === ".") continue;

                    let jsOperator = operator;
                    if (operator === "!=" || operator === "==") jsOperator += "=";

                    if (operator === "..") {
                        generated += `    "..": (a,b) => a[".."] ? a[".."](b) : ${BUILTIN_RANGE}(a, b),\n`;
                    } else {
                        generated += `    "${operator}": (a,b) => a["${operator}"] ? a["${operator}"](b) : a ${jsOperator} b,\n`;
                        if (UNARY_OPERATORS.includes(operator as any))
                            generated += `    "${operator}$": a => a["${operator}"] ? a["${operator}"]() : ${jsOperator}a,\n`;
                    }
                }

                generated += "}\n";

                let vars = "";
                for (const variable of this.currentScope.list()) {
                    if (variable.meta.isExport) continue;
                    vars += `let ${variable.name};\n`;
                }

                return generated + vars + genBody;
            }

            default:
                node satisfies never;
                throw new Error(`cannot transpile node ${(node as any).type}: unimplemented`);
        }
    }
}

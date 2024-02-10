import { OPERATORS, TokenType } from "./lexer";
import { ExternVariableType, ParserNode } from "./parser";

const BUILTIN_OPERATORS = "__kaOperators";
const BUILTIN_RANGE = "__kaGetRange";

function getIndent(level: number) {
    return "    ".repeat(level);
}

interface VariableMetadata {
    isClass: boolean;
}

export class Scope {
    private variables: Map<string, VariableMetadata> = new Map();

    add(name: string, isClass: boolean) {
        if (this.variables.has(name)) return;
        this.variables.set(name, { isClass });
    }

    get(name: string) {
        return this.variables.get(name);
    }

    list() {
        return Array.from(this.variables.entries()).map((v) => ({ name: v[0], meta: v[1] }));
    }
}

export class Transpiler {
    private indentLevel: number = 0;
    private currentScope: Scope = new Scope();
    private externVariables: Map<string, ExternVariableType> = new Map();

    constructor(private root: ParserNode) {}

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
                return `${BUILTIN_OPERATORS}["${node.operator.value}"](${this.visit(node.left)}, ${this.visit(
                    node.right
                )})`;

            case "functionCall":
                let classMaker = "";

                if (node.fn.type === "variableAccess") {
                    if (
                        this.currentScope.get(node.fn.name)?.isClass ||
                        this.externVariables.get(node.fn.name) === ExternVariableType.CLASS
                    )
                        classMaker = "new ";
                }
                return `${classMaker}${this.visit(node.fn)}(${this.visitJoined(node.arguments, ", ")})`;

            case "lambdaFunction": {
                this.indentLevel++;
                const out = `function(${node.parameters.map((tok) => tok.value).join(", ")}) {\n${this.visit(
                    node.body
                )}\n${getIndent(this.indentLevel - 1)}}`;
                this.indentLevel--;

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
                    if (!this.externVariables.has(node.name.name)) this.currentScope.add(node.name.name, false);
                return `${this.visit(node.name)} = ${this.visit(node.value)}`;

            case "expressionStatement":
                return `${getIndent(this.indentLevel)}${this.visit(node.expression)};`;

            case "blockStatement": {
                const previous = this.currentScope;
                this.currentScope = new Scope();

                const out = this.visitJoined(node.body, "\n");

                let vars = "";
                for (const variable of this.currentScope.list()) {
                    if (variable.meta.isClass) continue;

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

                for (let i = 0; i < fieldKeys.length; i++) {
                    generated += `${indent}"${fieldKeys[i].replaceAll('"', '\\"')}": ${this.visit(
                        node.fields[fieldKeys[i]]
                    )}`;

                    if (i !== fieldKeys.length - 1) generated += "," + sep;
                }

                return generated + sep + "}";
            }

            case "forStatement":
                if (!this.externVariables.has(node.variable.value)) this.currentScope.add(node.variable.value, false);
                return `${getIndent(this.indentLevel++)}for (${node.variable.value} of ${this.visit(
                    node.iterable
                )}) {\n${this.visit(node.body)}\n${getIndent(--this.indentLevel)}}`;

            case "whileStatement":
                return `${getIndent(this.indentLevel++)}while (${this.visit(node.condition)}) {\n${this.visit(
                    node.body
                )}\n${getIndent(--this.indentLevel)}}`;

            case "functionDeclaration":
                return `${getIndent(this.indentLevel++)}function ${node.name}(${node.parameters.join(
                    ", "
                )}) {\n${this.visit(node.body)}\n${getIndent(--this.indentLevel)}}`;

            case "returnStatement":
                return `${getIndent(this.indentLevel)}return${
                    node.expression ? " " + this.visit(node.expression) : ""
                };`;

            case "methodDeclaration":
                const name =
                    node.name.type === TokenType.OPERATOR
                        ? `"${node.name.value}"`
                        : node.name.value === "__init__"
                        ? "constructor"
                        : node.name.value;
                return `${getIndent(this.indentLevel++)}${name}(${node.parameters.join(", ")}) {\n${this.visit(
                    node.body
                )}\n${getIndent(--this.indentLevel)}}`;

            case "classDeclaration":
                this.currentScope.add(node.name, true);
                return `${getIndent(this.indentLevel++)}class ${node.name} {\n${node.methods
                    .map((m) => this.visit(m))
                    .join("\n")}\n${getIndent(--this.indentLevel)}}`;

            case "externDeclaration":
                this.externVariables.set(node.name, node.varType);
                return "";

            case "program": {
                const genBody = this.visitJoined(node.body, "\n");
                let generated = `const ${BUILTIN_RANGE} = (start, end) => {
    const out = [];
    for (let i = start; i < end; i++) {
        out.push(i);
    }
    return out;
}
const ${BUILTIN_OPERATORS} = {\n`;

                for (const operator of OPERATORS) {
                    let jsOperator = operator;
                    if (operator === "!=" || operator === "==") jsOperator += "=";

                    if (operator === "..") {
                        generated += `    "..": (a,b) => a[".."] ? a[".."](b) : ${BUILTIN_RANGE}(a, b),\n`;
                    } else {
                        generated += `    "${operator}": (a,b) => a["${operator}"] ? a["${operator}"](b) : a ${jsOperator} b,\n`;
                    }
                }

                let vars = "";
                for (const variable of this.currentScope.list()) {
                    if (variable.meta.isClass) continue;

                    vars += `let ${variable.name};\n`;
                }

                generated += "}\n";

                return generated + vars + genBody;
            }

            default:
                node satisfies never;
                throw new Error(`cannot transpile node ${(node as any).type}: unimplemented`);
        }
    }
}

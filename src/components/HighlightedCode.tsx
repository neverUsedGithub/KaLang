import "./HighlightedCode.scss";

const rules = [
  {
    regex: /("[^"]*")/,
    token: "string",
  },
  {
    regex: /(#[^\n]*)/,
    token: "comment",
  },
  {
    regex:
      /\b(function|do|end|with|class|new|if|then|else|for|while|in|continue|break|extern|import|export|from|default)\b/,
    token: "keyword",
  },
  {
    regex: /([A-Za-z_][A-Za-z_0-9]*)(?=\()/,
    token: "function-call",
  },
  {
    regex: /\b((?:0|[1-9][0-9]*)(?:\.[0-9]+)?)\b/,
    token: "number",
  },
  {
    regex: /\b(true|false)\b/,
    token: "boolean",
  },
  {
    regex: /\b(console|this)\b/,
    token: "builtin",
  },
  {
    regex: /(\+|-|\*|\/|==|!=|<=|>=|%|<|>|and|or|\.\.|\.)/,
    token: "operator",
  },
] as const;

export default function HighlightedCode({ code }: { code: string }) {
  const tokens = [];
  let text = "";

  codeLoop: for (let i = 0; i < code.length; i++) {
    for (const rule of rules) {
      const toMatch = text + code.substring(i);

      const match = rule.regex.exec(toMatch);

      if (!match) continue;
      if (match.index >= text.length + 1) continue;

      if (match.index <= text.length) {
        text = text.substring(0, match.index);
      }

      if (text.length !== 0) tokens.push({ type: "text", text });
      text = "";

      i += match[0].length - 1;
      tokens.push({ type: rule.token, text: match[1] });
      continue codeLoop;
    }

    text += code[i];
  }

  if (text.length !== 0) tokens.push({ type: "text", text });

  return (
    <pre className="highlighted-code">
      <code>
        {tokens.map((tok, i) => (
          <span key={i} style={{ color: `var(--hl-${tok.type})` }}>
            {tok.text}
          </span>
        ))}
      </code>
    </pre>
  );
}

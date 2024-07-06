import "./index.scss";

import { basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { transpileString } from "kalang";
import { indentWithTab } from "@codemirror/commands";
import { LexingError } from "kalang/lexer";
import { ParsingError } from "kalang/parser";
import { linter, Diagnostic } from "@codemirror/lint";
import { useRef, useEffect } from "react";

const kalangTheme = EditorView.theme(
  {
    "&": {
      color: "var(--fg-default)",
      background: "var(--bg-root)",
      flex: "1",
    },
    ".cm-line": {
      fontFamily: "var(--font-mono)",
    },
    ".cm-content": {
      caretColor: "var(--color-blue)",
      paddingTop: "4px",
    },
    "&.cm-focused .cm-cursor": {
      borderLeftColor: "var(--color-blue)",
      borderLeftWidth: "2px",
    },
    ".cm-selectionLayer": {
      zIndex: "2 !important",
    },
    ".cm-selectionBackground": {
      opacity: 0.2,
      backgroundColor: "var(--color-highlight) !important",
      pointerEvents: "none",
    },
    ".cm-gutters": {
      backgroundColor: "var(--bg-default)",
      color: "var(--fg-dimmer)",
      border: "none",
      fontFamily: "var(--font-mono)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "var(--bg-higher)",
    },
    ".cm-activeLine": {
      backgroundColor: "var(--bg-default)",
    },
    ".cm-tooltip": {
      backgroundColor: "var(--bg-higher)",
      border: "1px solid var(--outline-default)",
    },
  },
  {}
);

const kalangLinter = linter(
  (view) => {
    const diagnostics: Diagnostic[] = [];

    try {
      transpileString(view.state.doc.toString());
    } catch (e) {
      if (e instanceof LexingError)
        diagnostics.push({
          from: e.pos.index,
          to: e.pos.index + 1,
          severity: "error",
          message: e.reason,
        });
      else if (e instanceof ParsingError)
        diagnostics.push({
          from: e.span.start.index,
          to: e.span.end.index + 1,
          severity: "error",
          message: e.reason,
        });
      else throw e;
    }

    return diagnostics;
  },
  {
    delay: 200,
  }
);

export default function PlaygroundPage() {
  const lastDoc = useRef<string>("");
  const cmEditor = useRef<EditorView | null>(null);
  const editorEl = useRef<HTMLDivElement | null>(null);
  const sandboxEl = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (!editorEl.current) return;

    const state = EditorState.create({
      doc: `kaplay({ focus: false })

add([
  rect(20, 20),
  color(RED)
])`,
      extensions: [
        keymap.of([indentWithTab]),
        kalangTheme,
        basicSetup,
        kalangLinter,
        EditorView.updateListener.of(() => {
          const view = cmEditor.current!;
          const stringDoc = view.state.doc.toString();
          let output: string | null = null;

          if (lastDoc.current === stringDoc) return;

          lastDoc.current = stringDoc;

          try {
            output = transpileString(stringDoc);
          } catch (e) {
            if (!(e instanceof LexingError || e instanceof ParsingError))
              throw e;
            return;
          }

          if (sandboxEl.current)
            sandboxEl.current.srcdoc = `<html>
  <head>
    <style>
      html, body {
        height: 100%;
        overflow: hidden;
        margin: 0;
      }
    </style>
  </head>
  <body>
    <script src="https://cdn.jsdelivr.net/npm/kaplay@latest/dist/kaboom.min.js"></script>
    <script src="data:text/javascript;base64,${btoa(output)}"></script>
  </body>
</html>`;
        }),
      ],
    });
    cmEditor.current = new EditorView({ state, parent: editorEl.current });

    return () => {
      cmEditor.current!.destroy();
    };
  }, [editorEl]);

  return (
    <div className="router-page playground">
      <div className="editor" ref={editorEl}></div>
      <div className="canvas">
        <iframe ref={sandboxEl}></iframe>
      </div>
    </div>
  );
}

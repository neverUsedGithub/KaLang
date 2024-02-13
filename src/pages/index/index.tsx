import HighlightedCode from "@components/HighlightedCode";
import "./index.scss";

function IndexPage() {
  return (
    <main>
      <div className="router-page home">
        <header>
          <h1>KaLang</h1>
          <h5>
            A programming language designed to make game development fast & fun!
          </h5>
        </header>
        <section>
          <h2>Whats KaLang?</h2>
          <p>
            KaLang is a programming language that is meant to be used with the
            javascript library <a href="https://kaboomjs.com">Kaboom JS</a>, and
            is designed to make game development fast and fun. It is a
            transpiled language, meaning it is converted to another language
            (JavaScript) before being executed. It has a simple and expressive
            syntax, inspired by languages like Lua and JavaScript. It also has a
            VSCode extension that provides syntax highlighting and other
            features.
          </p>
        </section>
        <section>
          <h2>Getting started</h2>
          <p>
            Here's a step-by-step guide to help you get started with KaLang:
          </p>
          <h3>Step 1: Install the KaLang Transpiler</h3>
          <p>
            The KaLang transpiler converts KaLang code into JavaScript, which
            can be run in any browser or Node.js environment. You can install it
            globally using npm, the package manager for JavaScript.
          </p>
          <pre>
            <code>npm install -g kalang</code>
          </pre>
          <h3>Step 2: Install the VSCode Extension (Optional)</h3>
          <p>
            We've developed a VSCode extension for KaLang that provides syntax
            highlighting, code completion, and other useful features. You can
            find the extension on GitHub{" "}
            <a href="https://github.com/neverUsedGithub/KaLang-Extension">
              here
            </a>{" "}
            and install it manually.
          </p>
          <h3>Step 3: Write Your First Program</h3>
          <p>
            Here's a simple KaLang program that prints “Hello, World!” to the
            console:
          </p>
          <HighlightedCode
            code={`function main do
    console.log("Hello, World!")
end

main()`}
          />
          <h3>Step 4: Run Your Program</h3>
          <p>
            You can run your KaLang program using the kalang command. Just pass
            the name of your KaLang file as an argument:
          </p>
          <pre>
            <code>kalang run hello.kalang</code>
          </pre>
          <p>You should see “Hello, World!” printed in your terminal.</p>
        </section>
        <section>
          <h2>Links</h2>

          <ul>
            <li>
              <a href="https://github.com/neverUsedGithub/KaLang">
                The source code of the KaLang transpiler.
              </a>
            </li>
            <li>
              <a href="https://github.com/neverUsedGithub/KaLang-Extension">
                The source code of the KaLang VS Code extension.
              </a>
            </li>
            <li>
              <a href="https://github.com/neverUsedGithub/KaLang/tree/www">
                The source code of the site you are currently looking at.
              </a>
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}

export default IndexPage;

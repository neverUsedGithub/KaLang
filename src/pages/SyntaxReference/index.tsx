import "./index.scss";
import HighlightedCode from "@components/HighlightedCode";

export default function SyntaxReferencePage() {
  return (
    <main>
      <div className="router-page syntaxref">
        <h1>KaLang Syntax Reference</h1>
        <p>
          KaLang has a simple and expressive syntax inspired by languages like
          Lua and JavaScript. It supports common programming constructs such as
          functions, variables, and control flow.
        </p>

        <h2>Function Declaration</h2>
        <p>The syntax for declaring a function in KaLang is as follows:</p>
        <HighlightedCode
          code={`function functionName(arg1, arg2) do
    # Code block
end`}
        />

        <h2>Variable Declaration</h2>
        <p>To declare a variable in KaLang, use the following syntax:</p>
        <HighlightedCode code={`variable = value`} />

        <h2>Control Flow</h2>
        <p>
          KaLang supports if-else statements for control flow. Here's the
          syntax:
        </p>
        <HighlightedCode
          code={`if condition then # Code block
else if anotherCondition then # Another code block
else # Default code block
end`}
        />

        <h2>Loops</h2>

        <h3>For Loop</h3>
        <p>
          KaLang provides a flexible for loop syntax. Here are examples for
          iterating over a range of numbers and an array:
        </p>
        <HighlightedCode
          code={`# Loop through a range of numbers
for variable in 0..10 do
    # Code block
end

# Loop through an array
for variable in [1, 2, 3] do
    # Code block
end`}
        />

        <h3>While Loop</h3>
        <p>The while loop in KaLang is structured as follows:</p>
        <HighlightedCode
          code={`while condition do
    # Code block
end`}
        />

        <p>
          In addition, you have the option to exit loops prematurely using
          'break' and to skip the current iteration while continuing with the
          next one using 'continue'.
        </p>
        <HighlightedCode
          code={`while true do
    console.log("This only gets printed once!")
    break
end

for i in 0..10 do
    if i < 5 then
        continue
    end

    console.log(i)
end`}
        />

        <h2>Classes</h2>
        <p>
          KaLang supports the definition of classes with properties and methods.
          Here's an example class declaration:
        </p>
        <HighlightedCode
          code={`class ClassName do
    property = "default"
    
    __init__(arg) do
        this.property = arg
    end
    
    method() do
        # Code block
    end
end`}
        />

        <h2>External Variables</h2>
        <p>
          When assigning values to variables KaLang will try to, based on
          context, to automatically define all variables you use. This usually
          works well enough but when trying to access variables defined outside
          of your KaLang program, you might run into some issues. To combat this
          you should use the 'extern' keyword.
        </p>

        <HighlightedCode code={`extern myVariable`} />

        <h2>Imports/Exports</h2>
        <p>
          In KaLang you can easily import and export variables using the 'import' and 'export' keywords.
        </p>

        <HighlightedCode code={`import mylib
from mylib import foo, bar
from mylib import default fizz

export message = "Hello, World!"`} />
      </div>
    </main>
  );
}

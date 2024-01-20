const __kaGetRange = (start, end) => {
    const out = [];
    for (let i = start; i < end; i++) {
        out.push(i);
    }
    return out;
}
const __kaOperators = {
    "+": (a,b) => a["+"] ? a["+"](b) : a + b,
    "-": (a,b) => a["-"] ? a["-"](b) : a - b,
    "*": (a,b) => a["*"] ? a["*"](b) : a * b,
    "/": (a,b) => a["/"] ? a["/"](b) : a / b,
    "%": (a,b) => a["%"] ? a["%"](b) : a % b,
    "===": (a,b) => a["==="] ? a["==="](b) : a === b,
    "!==": (a,b) => a["!=="] ? a["!=="](b) : a !== b,
    "<=": (a,b) => a["<="] ? a["<="](b) : a <= b,
    ">=": (a,b) => a[">="] ? a[">="](b) : a >= b,
    "<": (a,b) => a["<"] ? a["<"](b) : a < b,
    ">": (a,b) => a[">"] ? a[">"](b) : a > b,
    "&&": (a,b) => a["&&"] ? a["&&"](b) : a && b,
    "||": (a,b) => a["||"] ? a["||"](b) : a || b,
    "..": (a,b) => a[".."] ? a[".."](b) : __kaGetRange(a, b),
}
let i;
kaboom();
scene(`main`, function() {
    let player;
    player = add([
        rect(20, 20),
        pos(40, __kaOperators["+"](40, 10)),
        color(RED),
        `player`
    ]);
    onKeyPress(`space`, function() {
        if (isMouseDown()) {
            burp();
        }
    });
});
function greet123() {
    console.log(`Hello, World!`, `asd`);
    return 456;
}
for (i of __kaOperators[".."](0, 10)) {
    console.log(i);
}
i = 0;
while (__kaOperators["<"](i, 10)) {
    console.log(i);
}
go(`main`);
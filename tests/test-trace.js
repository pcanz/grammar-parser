const grammar_parser = require("./grammar-parser.js");

const arith = String.raw`
  expr   = factor ([+-] factor)*
  factor = term ([*/] term)*
  term   = \d+ / "(" expr ")"
`;

const evaluate = {
  expr:   ([f, fs]) =>
            fs.reduce((y, [op, x]) =>
              op === '+'? y+x : y-x, f),   
  factor: ([t, ts]) =>
            ts.reduce((y, [op, x]) =>
              op === "*"? y*x : y/x, t),
  term:   ([x, expr, _]) => expr || Number(x)
}

const expr = grammar_parser(arith);//, evaluate);

var e = expr.parse("1+2*(3+4)-5", {trace:true});

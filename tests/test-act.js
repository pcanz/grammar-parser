const grammar_parser = require("./grammar-parser.js");

const tests = [

    { rules: String.raw`
        S    = \d+
        nums = (\s* \d+)*`,
      inputs: [ "123" ],
      actions: {
          S: (x) => {
              console.log('x=',x);
              // return null; // chk rule fails, pos=0
              return x;
          }
      }
    },

    { rules: String.raw`
        S    = "a" [b]+ 'c'* nums
        nums = (\s* \d+)*`,
      inputs: [ "abbcc 123 456"],
      actions: {
            S: (x) => {
                console.log('x=',x);
                // return null; // chk rule fails, pos=0
                return x;
            }
        }
    },

    { rules: String.raw`
        S =  [ab]+(c*)d*`,
      inputs: [ "abbccd"],
      actions: {
          S: (x) => {
              console.log('x=',x);
              return x;
          }
      }
    },

    { rules: String.raw`
        S =  x ([+-] x)* : yfx
        x = \d+`,
        inputs: [ "123+456-789"],
        actions: {
            S: (x) => {
                console.log('x=',x);
                return x;
            }
        }
    },

    { rules: String.raw`
        text  = (black / white)* : string
        black = [^\s"]+ ["]?
        white = \s* ["]?      
        `,
        inputs: [ '"First" and "last".', 'Not other"wise".' ],
        actions: {
            white: ([s, q]) => q? s+"&ldquo;" : s,
            black: ([b, q]) => q? b+"&rdquo;" : b
        }
    },

    { rules: String.raw`
        text  = (txt / quo)*   : string
        txt   = [^"]+          : x
        quo   = ["]            : smart
        `,
        inputs: [ '"First" and "last".', 'Not other"wise".' ],
        actions: {
            smart: (q, p) => {
                var {pos, input} = p;
                if (pos === 1 ||
                    input[pos-2] === " ") return "&ldquo;";
                return "&rduqo;";
            }
        }
    },

    { rules: String.raw`
        table = nl* row+            : _x
        row   = &[^] cells nl*      : _x_
        cells = cell ("," cell)*    : xfx
        cell  = [^,\n\r]*           : x
        nl    = \n / \r\n?          : _
    `,
    inputs: [`
a1,a2,a3
a2,b2,c2
`]
    },

    { rules: String.raw`
        expr   = factor ([+-] factor)*
        factor = term ([*/] term)*
        term   = \d+ / "(" expr ")"
        `,
      actions: {
        expr:   ([f, fs]) =>
                    fs.reduce((y, [op, x]) =>
                    op === '+'? y+x : y-x, f),   
        factor: ([t, ts]) =>
                    ts.reduce((y, [op, x]) =>
                    op === "*"? y*x : y/x, t),
        term:   (x) =>  Number(x) || x[1]
        },
      inputs: ["1+2*(3+4)-5"]
    },

    { rules: String.raw`
        nums = (\s* \d+)*`,
      inputs: [ "1 2 3" ],
      actions: {
          nums: (ns) =>
              ns.reduce((t, [_,x]) => t+Number(x), 0)
      }
    },

    { rules: String.raw`
        nums = (ws \d+)*  : (ns) => 
                ns.reduce((t, [_,x]) => t+Number(x), 0)
        ws = \s* : _
        `,
      inputs: [ "1 2 3" ],
      actions: {
          "?": (x, p) => {
              console.log("x",x, p.action);
              return x;
          }
      }
    }

];  // tests

// -- test runners -------------------------------------------------------

function run_tests(tests, trace) {
    var done = tests.map((test) => run_test(test, trace))
    console.log("==> "+done.reduce((n,m) => n+m, 0)+" tests run.");
};

function run_test(test, trace) {
    var {rules, inputs, actions} = test;

    const grip = grammar_parser(rules, actions);

    inputs.forEach((input) => {
        if (!trace) { // silent regression testing
            grip.parse(input);
        } else if (trace === 1) { // log the output
            var parse_tree = grip.parse(input);
            console.log(JSON.stringify(parse_tree, null, 2));
        } else { // trace parse & log output...
            var parse_tree = grip.parse(input,{trace:true});
            console.log(JSON.stringify(parse_tree, null, 2));
        }
    });

    return inputs.length;
};

function trace(i) {
    run_test(tests[i], 2)
}

function test(i) {
    run_test(tests[i], 1)
}

test(9)  // try an individual test

// run_tests(tests); // run them all...



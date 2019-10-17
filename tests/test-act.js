const grammar_parser = require("../grammar-parser.js");

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
        S =  x ([+-] x)*
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
        expects: [ '&ldquo;First&rdquo; and &ldquo;last&rdquo;.', 'Not other&rdquo;wise&rdquo;.' ],
        actions: {
            text: (x) => { console.log('text=',x); return x;},
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

module.exports = tests;




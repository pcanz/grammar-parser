const grammar_parser = require("../grammar-parser.js");

const tests = [

    { rules: String.raw`
        S    = \d+
        nums = (\s* \d+)*`,
      inputs: [ "123" ],
      actions: {
          S: (x) => {
              // console.log('x=',x);
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
                // console.log('x=',x);
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
              // console.log('x=',x);
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
                // console.log('x=',x);
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
            text: (x) => x, //{ console.log('text=',x); return x;},
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
        expects: [ '&ldquo;First&rdquo; and &ldquo;last&rdquo;.', 'Not other&rdquo;wise&rdquo;.' ],
        actions: {
            smart: (q, p) => {
                var {pos, input} = p;
                if (pos === 1 ||
                    input[pos-2] === " ") return "&ldquo;";
                return "&rdquo;";
            }
        }
    },

    { rules: String.raw`
        table = row+
        row   = nl* cell ("," cell)+
        cell  = [^,\n\r]*
        nl    = \n / \r\n?
        `,
        actions: {
            row: ([_, x, xs]) => [x, ...xs.map(([_,y]) => y)]
        },
        inputs: [ "a1,a2,a3\nb1,b2,b3"],
        expects: [ [["a1","a2","a3"],["b1","b2","b3"]] ]
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
      inputs: ["1+2*(3+4)-5"],
      expects: [ 10 ]
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
              // console.log("x",x, p.action);
              return x;
          }
      }
    }

];  // tests

module.exports = tests;


/* ======
    // Example usage:

    const grammar_parser = require("./grammar-parser.js");

    const cvs_rules = String.raw`
        table  := nl* row+
        row    := cells nl*
        cells  := cell ("," cell)*
        cell   := [^,\n\r]*
        nl     := [\n] / [\r][\n]?
    `;

    const csv_actions = {
        table: (_, rows) => rows,
        cells: ([c, cs]) => 
                cs.reduce((xs,[_,x]) => xs.concat(x),[c]),
        cell:  (s) => s
    }

    const cvs = grammar_parser(cvs_rules, csv_actions);

    var test = `
    a1,b1,c1
    a2,b2,c3
    a3,b3,c3
    `;

    var parse_tree = cvs.parse(test);

    console.log(JSON.stringify(parse_tree, null, 2));

    // parse(input, options)

    // options: { // default values...
    //      trace: false,  // true to trace parse
    //      replay: false, // to trace after parse failure
    //      silent: false, // to not throw any faults or print reports
    //      console: false // to use console.log (don't throw Errors)
    //      report: null   // report faults when silent = true
    //  }

*/







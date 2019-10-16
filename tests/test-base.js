const grammar_parser = require("../grammar-parser.js");

const tests = [

{ rules: String.raw`
    S =  ''
`, // => ''
  inputs: [ "" ]
},
{ rules: String.raw`
    S =  ""
`, // => ''
  inputs: [ "", "  " ]
},
{ rules: String.raw`
    S =  'a'
`, // => "a"
  inputs: [ "a"]
},
{ rules: String.raw`
    S =  "a"
`, // => "a"
  inputs: [ "a", "  a", "a ", " a "]
},
{ rules: String.raw`
    S = "a" 'b'
`, // => ['a','b']
  inputs: [ "ab", " a b"]
},
{ rules: String.raw`
    S =  "a"+
`, // => ["a","a","a"] // a list of strings
  inputs: ["a", "aaa", "  a  a a "]
},
{ rules: String.raw`
S =  [^]
`, // => 'x'  // match any char
inputs: [ "a", "x" ]
},
{ rules: String.raw`
    S =  [a]
`, // => ["S","a"]
  inputs: [ "a" ]
},
{ rules: String.raw`
    S =  \d+
`, // => ["S","123"]
  inputs: ["123"]
},
{ rules: String.raw`
    S =  \s*\d+
`, // => ["S","  123"]
  inputs: ["  123"]
},
{ rules: String.raw`
    S =  \s*(\d+)
`, // => ["S","123"]
  inputs: ["123", "  123"]
},
{ rules: String.raw`
    S =  \s*(\d+(\w+\s*)+)
`, // => ["S","123abc  "]
  inputs: ["123abc", "  123abc ", "1a b c"]
},
{ rules: String.raw`
    S =  \s*((\w+(\s*\d+)*)+)
`, // => ["S","abc 123 456def 321"]
  inputs: ["abc 123 456def 321"]
},
{ rules: String.raw`
    S =  \s*((\w+(\s*\d+)*)+)
    `, // => ["S","abc 123 456def 321"]
  inputs: [ "abc 123 456def 321" ]
},
{ rules: String.raw`
    S = x y
    x = "a"
    y = [b]
`, // => ["S",[["x","a"],["y","b"]]
  inputs: [ "ab" ]
},
{ rules: String.raw`
    S = x / y
    x = "a"
    y = [b] `, // => ["S",["x","a"]]
  inputs: [ "a", "b" ]
},
{ rules: String.raw`
    S = (x y)+
    x = "a"
    y = [b]
`, // => ["S",[ [["x","a"],["y","b"]], [["x","a"],["y","b"]], .. ]]
  inputs: [ "ab", "  ab", "ababab"]
},
{ rules: String.raw`
    S = 'a' S? 'b'
`, // => ["S",['S',['a',['S',[...]],'b'] ]
  inputs: [ "ab", "aaabbb"]
}


]; // tests

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
    if (i<0) i = tests.length-i;
    run_test(tests[i], 2)
}

function test(i) {
    if (i<0) i = tests.length-i;
    run_test(tests[i], 1)
}

// test(0)  // try an individual test


run_tests(tests); // run them all...


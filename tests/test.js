const grammar_parser = require("../grammar-parser.js");

const base_tests = require("./test-base.js");

const action_tests = require("./test-act.js");


// command line ...

const [node, file, report] = process.argv

run_tests(base_tests, report); // default only report failures...

run_tests(action_tests, report); // default only report failures...


// -- test runners -------------------------------------------------------

function run_tests(tests, report) {
    tests.map((test, n) => { test.results = run_test(test, n); return test});
    if (report === "1") console.log(tests);
    var total = tests.reduce((n, test) => n+test.inputs.length,0)
    var failed = tests.reduce((n, test) => test.failed? n+1 : n, 0);
    console.log("==> "+tests.length+" tests, "+total+" examples, "+failed+" failed.");
};

function run_test(test, n) {
    var {rules, actions, inputs, expects} = test;

    const grip = grammar_parser(rules, actions);

    const parse = (input, n, i) => {
        try {
            var result = grip.parse(input);
            if (expects) {
               if (!match(result, expects[i])) {
                console.log(n+"."+i+" unexpected result...");
                console.log("result:   "+result);
                console.log("expected: "+expects[i]);
                test.failed = true;
               } 
            }
            return result;
        } catch(err) {
            test.failed = true;
            console.log(n+"."+i+" failed ...")
            console.log(rules)
            console.log(input);
            console.log(err.message);
            return null;
        } 
    }

    return inputs.map((input, i) => parse(input, n, i));
};

function match(xs, ys) {
    if (Array.isArray(xs)) {
        return xs.every((x, i) => match(x, ys[i]));
    } else return xs === ys;
}

function trace(i) {
    if (i<0) i = tests.length-i;
    run_test(tests[i], 2)
}

function test(i) {
    if (i<0) i = tests.length-i;
    run_test(tests[i], 1)
}



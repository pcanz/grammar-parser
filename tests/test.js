const grammar_parser = require("../grit-parser.js");

const test_files = ["test-base", "test-act"]

// command line ...

const [node, file, test_id] = process.argv

if (!test_id) {
    test_files.forEach((file,idx) => {
        console.log("Run tests: "+idx+" file: "+file);
        run_tests(require("./"+file+".js"), idx);
    })
} else {
    let id = grammar_parser("id = \\d+ '.' \\d+")
    let tid;
    try { tid = id.parse(test_id); } catch(err) { tid = null; }
    if (!tid) console.log("test arg: '"+test_id+"'? Expecting: i.j to select a test case...")
    else {
        var [idx, _, i] = tid
        var tests = require("./"+test_files[idx]+".js");
        run_tests(tests, idx, i, 1);
    }
}

// -- test runners -------------------------------------------------------

function run_tests(tests, idx, i, report) {
    if (i) {
        let test = tests[i];
        run_test(test, idx, i, report);
        return; 
    }
    tests.map((test, n) => { test.results = run_test(test, idx, n); return test});
    var total = tests.reduce((n, test) => n+test.inputs.length,0)
    var failed = tests.reduce((n, test) => test.failed? n+1 : n, 0);
    console.log(idx+": "+test_files[idx]+" ==> "+tests.length+" tests, "+
        total+" examples, "+failed+" failed.");
};

function run_test(test, idx, i, report) {
    var {rules, actions, inputs, expects} = test;

    const grip = grammar_parser(rules, actions);

    const parse = (input, j) => {
        try {
            var result = grip.parse(input);
            if (expects) {
               if (!match(result, expects[j])) {
                console.log(idx+"."+i+"."+j+" unexpected result...");
                console.log("result:   "+JSON.stringify(result));
                console.log("expected: "+JSON.stringify(expects[j]));
                test.failed = true;
               } 
            }
            return result;
        } catch(err) {
            test.failed = true;
            console.log(idx+"."+i+"."+j+" failed ...")
            console.log(rules)
            console.log(input);
            console.log(err.message);
            return null;
        } 
    }

    if (report === 1) console.log(JSON.stringify(test, null, 2))

    return inputs.map((input, j) => parse(input, j));
};

function match(xs, ys) {
    if (Array.isArray(xs)) {
        if (xs.length !== ys.length) null;
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



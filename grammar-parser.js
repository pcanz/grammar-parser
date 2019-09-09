// Grammar Parser -- an evolution of Grit.

/*	The MIT License (MIT)
 *
 *	Copyright (c) 2015,2016,2017,2018,2019 Peter Cashin
 *
 *	Permission is hereby granted, free of charge, to any person obtaining a copy
 *	of this software and associated documentation files(the "Software"), to deal
 *	in the Software without restriction, including without limitation the rights
 *	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *	copies of the Software, and to permit persons to whom the Software is
 *	furnished to do so, subject to the following conditions:
 *
 *	The above copyright notice and this permission notice shall be included
 *	in all copies or substantial portions of the Software.
 *
 *	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 *	FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 *  DEALINGS IN THE SOFTWARE.
 */

/*
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

;(function() { // module name-space wrapper -- see the end of this file...

// -- grammar rule grammar ---------------------------------------

const grit_rules = String.raw`
    grammar = rule+
    rule    = name "=" expr ws act?

    expr    = seq ("/" seq)*
    seq     = (ws [&!]? term [*+?]?)*
    term    = ref / match / group

    name    = ws \w+
    ref     = name !\s*=
    match   = quote / regex
    quote   = '"' [^"]* '"' / "'" [^']* "'"
    regex   = &[[\\] (rex / par)*
    rex     = [^\s[()]+|[[]([^\]\\]*([\\][^])?)*[\]]
    par     = [(] ([^()]* par?)* [)]
    group   = "(" expr ")"

    act     = ":" lines
    lines   = line (\s* !\S+\s*= line)*
    line    = [^\n\r]* 
    ws      = \s*  
`;

// const grit_rules = String.raw`
//     rules := rule+
//     rule  := name ":"? "=" exp act?
//     exp   := seq ("/" seq)*
//     seq   := term+
//     term  := [ \t]* [&!]? prime [*+?]?
//     prime := ref / rex / group
//     group := "(" exp ")"
//     act   := ":" ":"? [ \t]* [^\n\r]*

//     name  := [\s]* [\w]+
//     ref   := [\w]+
//     rex   := [~]? (quo / chs / esc / reg)+
//     quo   := "'" [^']* "'" / '"' [^"]* '"'
//     esc   := "\" [\S] [*+?]?
//     chs   := "[" [^\x5D]+ "]" [*+?]?
//     reg   := [(] (rex/reg/[/|])+ [)]

//     rep   := [*+?] / [{] \d*[,]?\d*  [}]    
// `;

// rep is not used here (only [*+?]?),
// to use rep would require extra parse engine instructions,
// but the {n,m} is allowed on chs and esc, see grit_actions.

// quo (quoted strings) skip leading white-space, see grit_actions.
// ~ prefix on a regex component to skip leading white-space.

// no way to use a /xxx/i case insensitive regex
// it could be added to quo, but it wouldn't work in reg groupings.

// -- parser code for grit_rules --------------------------------------

// The parser is a byte-code style interpreter, but uses a
// higher level array data structure with string values.

/* parser instruction codes:

    ["^", "regex"]      match regexp
    ["=", rule]         call rule by name.
    [",", a, b, c, ...] sequence of instruction codes, all to succeed.
    ["/", a, b, c, ...] altrnatives, first to succeed.
    ["+", x]            matches one or more x, or fails.
    ["*", x]            matches any number of x, none matches "".
    ["?", x]            optional match: x / ""
    ["&", x]            lookahead: "" if x matches, else fails.
    ["!", x]            negation: fails if x matches, else "".
 
    The parser compiles rule names to rule indexes on the fly, and also
    compiles regexp's on the fly (to keep the code simple, and portable).

    The parser code can be exported as JSON.
*/

const grit_code = [
    {   name: "grammar", // grammar = rule+
        code: ["+",["=","rule"]] },

    {   name: "rule", // rule = name "=" expr ws act?
        code: [",",["=","name"],["^","\\s*="],["=","expr"],
                        ["=", "ws"],["?",["=","act"]]] },

    {   name: "expr", // expr = seq ("/" seq)*
        code: [",",["=","seq"],["*",[",",["^","\\s*/"],["=","seq"]]]] },

    {   // seq = (ws [&!]? term [*+?]?)*
        name: "seq",
        code: ["*",[",",["=","ws"],["^","[&!]?"],["=","term"],["^","[*+?]?"]]] },

    {   name: "term", // term = ref / match / group
        code: ["/",["=","ref"],["=","match"],["=","group"]] },

    {   name: "name", // name = ws \w+
        code: [",",["^","[\\s]*"],["^","[\\w]+"]] },

    {   name: "ref", // ref = name !\s*=
        code: [",",["=","name"],["!",["^","[\\s]*="]]] },

    {   name: "match", // match = quote / regex
        code: ["/",["=","quote"],["=","regex"]] },

    {   name: "quote", // quote = '"' [^"]* '"' / "'" [^']* "'"
        code: ["^","\\s*((?:'[^']*'|\"[^\"]*\")[\\w]*)"] },

    {   name: "regex", // regex = &[[\\] (rex / par)*
        code: [",",["&",["^","[[\\\\]"]],["*",["/",["=","rex"],["=","par"]]]] },

    {   name: "rex", // rex = [\s[()]+|[[]([^\]\\]*([\\][^])?)*[\]]
        code: ["^","[^\\s[()]+|[[](?:[^\\]\\\\]*(?:[\\\\][^])?)*[\\]]"] },

    {   name: "par", // par = [(] ([^()]* par?)* [)]
        code: [",",["^","[(]"],["*",[",",["^","[^()]*"],["?",["=","par"]]]],["^","[)]"]] },

    {   name: "group", // group = "(" expr ")"
        code: [",",["^","\\s*\\("],["=","expr"],["^","\\s*\\)"]] },

    {   name: "act", // act = ":" lines
        code: [",",["^","\\s*:"],["^","[^\\n\\r]*"], // line = [^\n\r]*
                ["*",[",",["^","\\s*"],["!",["^","\\S+\\s*="]],
                          ["^","[^\\n\\r]*"]]]] },

    {   name: "ws", // ws = \s* 
        code: ["^","\\s*"] }
];

resolve_code(grit_code);

// -- compile peg rules into parser instruction codes --------------------

const grit_actions = { // semantic actions for parse tree nodes...

    // grammar = rule+
    "grammar": (rs) => rs,

    // rule = name "=" expr ws act?
    "rule": ([name, _, code, ws, action]) => {
        return {name, code, action};
    },

    // expr = seq ("/" seq)*
    "expr": ([seq, alts]) => {
        if (alts.length === 0) {
            return seq;
        } else {
            var seqs = alts.map(([_, seq]) => seq)
            return ["/", seq, ...seqs];
        }
    },

    // seq = (ws [&!]? term [*+?]?)*
    "seq": (xs) => {
        var ts = xs.map(([ws, pred, term, rep]) => {
            if (rep) { term = [rep, term]; }
            if (pred) { term = [pred, term];}
            return term;
        })
        if (ts.length === 1) return ts[0];
        return [",", ...ts];
    },

    // term = ref / match / group
    "term": (x) => x,

    // name = ws \w+
    "name": ([_, name]) => name,

    // ref = name !\s*=
    "ref":  ([name, _]) => ["=", name, null],

    // match = quote / regex
    "match": (x) => x,

    // quote = '"' [^"]* '"' / "'" [^']* "'"
    "quote": (str) => { // quote => regex: \s*("...")
        qt = str.slice(1,-1);
        return ["^","\\s*("+esc_regex(qt)+")"];
    },

    // regex   = &[[\\] (rex / par)*
    "regex": ([_, rs]) => ["^", rs.join('')],

    // rex = [^\s[()]+|[[]([^\]\\]*([\\][^])?)*[\]]
    "rex": (x) => x,

    // par = [(] ([^()]* par?)* [)]
    "par": ([lp, ps, rp]) => { // par? => p, will be already done..
        var xps = ps.map(([x, p]) => p? x+p : x);
        return lp + xps.join('') + rp; 
    },

    // group = "(" expr ")"
    "group": ([_, expr]) => expr,

    // act = ":" lines
    "act": ([_, line, lines]) => {
        return string([line, lines]);
    },

    // ws = \s*
    "ws": (s) => s

} // grit_actions

function esc_regex(str) {
    return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

function rules_map(code) {
    return code.reduce((rm, rule, idx) => {
        rm[rule.name] = idx; return rm; }, {});
}

function resolve_code(code) {
    var name_idx = rules_map(code);

    function resolve (op) {
        if (!Array.isArray(op)) return op;
        if (op[0] === "^") {
            op[2] = op[2] || new RegExp(op[1],"y"); // sticky flag
            return op;
        }
        if (op[0] === "=") {
            op[2] = name_idx[op[1]];
            if (!op[2] && op[2]!==0) {
                throw new Error("*** missing rule '"+op[1]+"' ... ")
            }
            return op;
        }
        return op.map((x) => resolve(x));
    }
    var coded = code.map((rule, idx) => {
        return resolve(rule.code);
    });

    return code;
}


// -- built-in semantic actions ---------------------------------------------


const std_actions = {

    xfx: (result) => { // a (_ b)* => [a,b,c,...]
        var [a, bs] = result;
        return bs.reduce((y, [_, b]) => y.concat(b), [a]);
    },

    xfy: (result) => { // a (op b)* => [op,x,y]
        function xfy(x, ys) {
            if (ys.length === 0) return x;
            var [op, y] = ys[0];
            return [op, x, xfy(y, ys.slice(1))]
        }
        var [x, ys] = result;
        return xfy(x, ys);
    },
 
    yfx: (result) => { // a (op b)* => [op,y,x]
        var [a, bs] = result;
        return bs.reduce((y, [op, b]) => [op, y, b], a)
    },

    yfy: (result) => { // a (op b)* => [a,op,b,op,c,...]
        var [a, bs] = result;
        return bs.reduce((y, b) => y.concat(b), [a])
    },

    flatten: (xs) => flatten(xs),

    string: (xs) => string(xs),

    number: (xs) => number(xs),

    x: (result) => result,
    n: (result) => Number(result),
    _: (result) => ""

}

function flatten(xs) {
    return Array.isArray(xs)?
        xs.reduce((y,x) => y.concat(flatten(x)),[]) : xs;
}

function string(xs) {
    return Array.isArray(xs)? flatten(xs).join('') : xs;
}

function number(xs) {
    return Number(string(xs));
}

// -- parser -- string-code interpreter ------------------------------------

function parser (code, input, actions={}, options={}) {
    var pos = 0;
    var inRule = "start"; // rule trace 
    var ruleStack = [];
    var maxPos = 0; // high water mark
    var maxRule= "none"; // inRule at maxPos
    var runOps = 0;
    var maxOps = 10000; // run away recursion check

    if (!code) {
        return report("missing grammar rule code...");
    }

    var start_name = code[0].name;
    var start = ["=", start_name, 0];

    if (typeof input !== "string") {
        try {
            input = String.raw(input);
        } catch(err) {
            input = '';
            return report("input is not a string...");
        }
    }

    if (typeof actions === 'function') {
        actions = { "?": actions } // catch all
    }

    if (options.trace) console.log("trace", start_name)

    var result = run(start); // run the parser engine...

    if (result === null) {
        return report("failed");
    }
    if (pos < input.length && !input.slice(pos).match(/^\s+$/)) {
        if (options.replay) replay();
        return report("fell short");
    }
    return result;

    // -- code engine -------------------------------------------

    function run(op) {

        if (runOps += 1 > maxOps) {
            return report("run away recursion...");
        }

        switch (op[0]) {

        case '^': // ["^", src, regex]
            var regex = op[2]; 
            regex.lastIndex = pos; // using regex.y sticky flag
            var mx = regex.exec(input);
            var trace = options.trace;
            if (trace) {
                if (typeof trace !== "string" || trace === inRule) {
                    var span = pos;
                    span += mx? ".."+(pos+mx[0].length) : ""
                    var match = mx? "=>"+mx[0] : "!";
                    console.log(span,inRule,regex,match);
                }
            }
            if (!mx) return null;
            pos += mx[0].length;
            if (pos > maxPos) { 
                maxPos = pos; 
                maxRule = inRule;
            }
            return mx[1]||mx[0]; // used to skip white-space prefix

        case '=': // ["=", name, idx]
            var idx = op[2];
            var rule = code[idx];
            if (!rule) { // bad grammar ...
                return report("missing rule "+idx+": '"+op[1]+"' ...");
            }
            ruleStack.push(inRule)
            inRule = op[1];
            var start = pos;
            var result = run(rule.code);
            inRule = ruleStack.pop();
            if (result === null) {
                pos = start;
                return null;
            }
            var {name, action} = rule;
            var val = run_action(result, {name, action, pos, input, posit});
            if (val !== null) return val;
            pos = start; // fail
            return null;

        case ',': // [",", ..., seq, ... ]
            var start = pos;
            var res = [];
            var i = 1;
                while (i < op.length) {
                var temp = run(op[i]);
                if (temp === null) {
                    pos = start;
                    return null;
                }
                res.push(temp);
                i += 1;
            }
            return res;

        case '/': // ["/", ..., alt, ... ]
            var start = pos;
            var res = null; // fail if no alt
            var i = 1;
            while (i < op.length) {
                res = run(op[i]);
                if (res !== null && pos > start) {
                    return res;
                }
                pos = start;
                i += 1;
            }
            return res;

        case '*':
            var start = pos;
            var temp = run(op[1]);
            if (temp === null) return [];
            var res = [temp];
            while (pos > start) {
                start = pos;
                temp = run(op[1]);
                if (temp === null) break;
                res.push(temp);
            }
            return res;

        case '+':
            var start = pos;
            var temp = run(op[1]);
            if (temp === null) return null;
            var res = [temp];
            while (pos > start) {
                start = pos;
                temp = run(op[1]);
                if (temp === null) break;
                res.push(temp);
            }
            return res;

        case '?':
            var res = run(op[1])
            if (res === null) return "";
            return res;

        case '!':
            var start = pos
            var res = run(op[1])
            pos = start
            if (res === null) return "";
            return null;

        case '&':
            var start = pos
            var res = run(op[1])
            pos = start
            if (res !== null) return "";
            return null;

        default: // should never happen...
		    throw new Error("*** Undefined parse code op: "+JSON.stringify(op));
        }
    } // run

    function report(msg) {
        var at = pos + (maxPos>pos? ".."+maxPos : "") + " of " + input.length;
        var pre = pos<16? input.slice(0,pos) : "..."+input.slice(pos-13,pos);
        var show = pre + input.slice(pos,pos+40);
        show = show.replace(/[\x00-\x1f]/g,"¬")
        if (input.length > pos+40) show += "..."
        var cursor = "";
        for (var i=0; i < pre.length; i+=1) cursor += " ";
        cursor += "^";
        var max = maxPos-pos>40? 42 : maxPos;
        for (var i=pos+1; i < max; i+=1) cursor += " ";
        cursor += "^";
        var report = "*** grammar '"+start_name+"' parse "+msg+
                    " after: '"+maxRule+"' at: "+at+"\n"+
                        show+"\n"+cursor;
        if (!options || (!options.silent && !options.console)) {
            throw new Error(report);
        } else if (options.console && !options.silent) {
            console.log(report);
        } else { // silent reporting...
            options.report = report;
        }
        return null;
    }

    function replay() {
        try {
            parser(code, input, actions, {trace:true});
        } catch(err) {
            // console.log(err);
        }
    }

    function posit(n) {
        console.log("posit", pos, n);
        pos = n;
    }

    function run_action(result, parse) {
        var fn = null;
        var {name, action} = parse; // {name, action, pos, input, posit}
        if (action) {
            var ax = action.match(/^\s*(\S+)/);
            act = ax? ax[1] : "";
            fn = actions[act] || std_actions[act];
            if (!fn) { // synthetic std act...
                if (act.match(/^[_x]+$/) && Array.isArray(result)) {
                    var res = [];
                    result.forEach((x, i) => {
                        var k = act[i];
                        if (k === "x") res.push(x);
                    });
                    if (res.length === 1) return res[0];
                    return res;
                }            
            }
        } // action
        fn = fn || actions[name] || actions["?"];
        if (fn) {
            try {
                return fn(result, parse);
            } catch(err) {
                report("Bad action for '"+name+"':\n"+err);
            }
        }
        return [name, result] // default result..
    }


} // parser

// -- grammar_parser --------------------------------------------------------

function grammar_parser (grammar, actions) {

    let code = parser(grit_code, grammar, grit_actions)

    if (!code) return null;
    
    resolve_code(code)

    function parse(input, options) {
        return parser(code, input, actions, options);
    }

    return Object.freeze({
        parse, grammar, actions, code
    })
}

// module.exports = grammar_parser;
// expose grammar_parser ----------------------------------------------

if (typeof module !== 'undefined' && typeof exports === 'object') {
    module.exports = grammar_parser;
} else if (typeof define === 'function' && define.amd) {
    define(function() { return grammar_parser; });
} else {
    this.grammar_parser = grammar_parser;
}

}).call(function() {
return this || (typeof window !== 'undefined' ? window : global);
}()); // outer funtion name-space wrapper

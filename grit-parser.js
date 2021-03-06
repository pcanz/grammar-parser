// Grammar Parser -- an evolution of Grit.

// See docs at: https://github.com/pcanz/grammar-parser

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

;(function() { // module name-space wrapper -- see the end of this file...

/* -- grammar-rule grammar ---------------------------------------

    grammar = rule+
    rule    = name "=" expr ws act?

    expr    = seq ("/" seq)*
    seq     = (ws [&!]? term [*+?]?)*
    term    = ref / quote / regex / group

    name    = ws \w+
    ref     = name !\s*=
    group   = "(" expr ")"

    quote   = '"' [^"]* '"' / "'" [^']* "'"
    regex   = &[[\\^] (chs / par / misc)+
    chs     = [\[] ([^\]\\]* ([\\][^])?)+ [\]]
    par     = [(] ([^()]* par?)* [)]
    misc    = [^[()\s]+

    act     = ":" lines
    lines   = line (\s* !\S+\s*= line)*
    line    = [^\n\r]* 
    ws      = \s*  
*/

// -- parser code for grit_rules --------------------------------------

// The parser is a byte-code style interpreter, but encodes
// instructions an array data structure with string values.

/* parser instruction codes:

    ["^", "regex"]      match regexp
    ["=", rule]         call rule by name.
    [",", a, b, c, ...] sequence of instruction codes, all to succeed.
    ["/", a, b, c, ...] alternatives, first to succeed.
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
    {   name: "__grit__grammar", // grammar = rule+
        code: ["+",["=","rule"]] },

    {   name: "rule", // rule = name "=" expr ws act?
        code: [",",["=","name"],["^","\\s*="],["=","expr"],
                        ["=", "ws"],["?",["=","act"]]] },

    {   name: "expr", // expr = seq ("/" seq)*
        code: [",",["=","seq"],["*",[",",["^","\\s*/"],["=","seq"]]]] },

    {   // seq = (ws [&!]? term [*+?]?)*
        name: "seq",
        code: ["*",[",",["=","ws"],["^","[&!]?"],["=","term"],["^","[*+?]?"]]] },

    {   name: "term", // term = ref / quote/ regex / group
        code: ["/",["=","ref"],["=","quote"],["=","regex"],["=","group"]] },

    {   name: "name", // name = ws \w+
        code: [",",["^","[\\s]*"],["^","[\\w]+"]] },

    {   name: "ref", // ref = name !\s*=
        code: [",",["=","name"],["!",["^","[\\s]*="]]] },

    {   name: "quote", // quote = '"' [^"]* '"' / "'" [^']* "'"
        code: ["^","\\s*((?:'[^']*'|\"[^\"]*\")[\\w]*)"] },

    {   name: "regex", // regex = &[[\\^] (chs / par / misc)+
        code: [",",["&",["^","[[\\\\^]"]],["+",["/",["=","chs"],["=","par"],["=","misc"]]]] },

    {   name: "chs", // [\[] ([^\]\\]* ([\\][^])?)+ [\]]
        code: ["^","[[](?:[^\\]\\\\]*(?:[\\\\][^])?)+[\\]]"] },

    {   name: "par", // par = [(] ([^()]* par?)* [)]
        code: [",",["^","[(]"],["*",[",",["^","[^()]*"],["?",["=","par"]]]],["^","[)]"]] },

    {   name: "misc", // [^[()\s]+
        code: ["^","[^[()\\s]+"] },

    {   name: "group", // group = "(" expr ")"
        code: [",",["^","\\s*\\("],["=","expr"],["^","\\s*\\)"]] },

    {   name: "act", // act = ":" lines
        code: [",",["^","\\s*:"],["^","[^\\n\\r]*"], // line = [^\n\r]*
                ["*",[",",["^","\\s*"],["!",["^","\\S+\\s*="]],
                            ["^","[^\\n\\r]*"]]]] },

    {   name: "ws", // ws = \s* 
        code: ["^","\\s*"] }
];

resolve_code(grit_code); // maps names to indexes & compiles regexes

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

    // group = "(" expr ")"
    "group": ([_, expr]) => expr,

    // quote = '"' [^"]* '"' / "'" [^']* "'"
    "quote": (str) => { // quote => regex: \s*("...")\s*
        if (str.length === 2) { // empty quotes..
            return (str[0] === "'")? ["^","\uFFFF?"] : ["^","\\s*(\uFFFF?)"];
        }
        qt = str.slice(1,-1);
        if (str[0] === "'") return ["^",esc_regex(qt)];
        return ["^","\\s*("+esc_regex(qt)+")\\s*"];
    },

    // // regex   = &[[\\^] (chs / par / misc)*
    // "regex": ([_, rs]) => rs[0]==='^'? 
    //             ["^", rs.slice(1).join('')] : ["^", rs.join('')],

    // regex   = &[[\\^] (chs / par / misc)*
    "regex": ([_, rs]) => rs[0] && rs[0][0]==='^'? 
                ["^", rs[0].slice(1)+rs.slice(1).join('')]
                : ["^", rs.join('')],

    // par = [(] ([^()]* par?)* [)]
    "par": ([lp, ps, rp]) => { // par? => p, will be already done..
        var xps = ps.map(([x, p]) => p? x+p : x);
        return lp + xps.join('') + rp; 
    },

    // act = ":" lines
    "act": ([_, line, lines]) => {
        return string([line, lines]);
    },

    // ws = \s*
    "ws": (s) => s

} // grit_actions

function esc_regex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
            op[2] = op[2] || new RegExp(op[1],"yus"); // sticky unicode dots flags
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
    var coded = code.map((rule) => {
        return resolve(rule.code);
    });

    return code;
}
    
// -- parser -- string-code interpreter ------------------------------------

const ANON = "__anon__"; // default name for first rule

function parser (code, input, actions={}, options={}) {
    var pos = 0;
    var inRule = "start"; // current rule trace 
    var ruleStack = [];
    var maxPos = 0; // high water mark
    var maxRule= ""; // inRule at maxPos
    var runOps = 0;
    var maxOps = 10000; // run away recursion check

    if (!code) {
        return report("missing grammar rule code...");
    }

    var start_name = code[0].name;
    var start = ["=", start_name, 0];

    if (typeof input !== "string") {
        try { // tag`grammar..` => tag([grammar...], ${}...)
            input = String.raw(input);
            if (!input.match(/^\s*\S+\s*=/)) {
                input = ANON+" = "+input; // simple regex grammar
            }
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
    return [result, pos];

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
            // return mx[1]||mx[0]; // used to skip white-space prefix
            if (mx.length === 1) return mx[0];
            if (mx.length === 2) return mx[1];
            return mx.slice(1);

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
            var val = run_action(result, {name, action, pos, input, posit, env:options});
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
            var j = 1;
            while (j < op.length) {
                res = run(op[j]);
                if (res !== null && pos > start) {
                    return res;
                }
                pos = start;
                j += 1;
            }
            return res;

        case '*': // ["*", op]
        var start = pos;
        var temp = run(op[1]);
        if (temp === null) return [];
        var res = [temp];
        while (true) {
            start = pos;
            temp = run(op[1]);
            if (temp === null || pos === start) break;
            res.push(temp);
        }
        return res;

        case '+': // ["+", op]
            var start = pos;
            var temp = run(op[1]);
            if (temp === null) return null;
            var res = [temp];
            while (true) {
                start = pos;
                temp = run(op[1]);
                if (temp === null || pos === start) break;
                res.push(temp);
            }
            return res;

        case '?': // ["?", op]
            var res = run(op[1])
            if (res === null) return "";
            return res;

        case '!': // ["!", op]
            var start = pos
            var res = run(op[1])
            pos = start
            if (res === null) return "";
            return null;

        case '&': // ["&", op]
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
        var [line, col] = line_of(pos);
        var lx = " "+line+"."+col;
        // var at = pos + (maxPos>pos? ".."+maxPos : "") + " of " + input.length;
        //var pre = pos<16? input.slice(0,pos) : "..."+input.slice(pos-13,pos);
        var pre = line<2? input.slice(0,pos) : "..."+input.slice(pos-13,pos);
        var show = pre + input.slice(pos,pos+40);
        show = show.replace(/[\x00-\x1f]/g,(c) => {
            if (c === "\n" || c === "r") return "\u00AC";
            if (c === "\t") return "\u2023"
            return "\u00A4";
        })
        // show = show.replace(/[\x00-\x1f]/g,"¬")
        if (input.length > pos+40) show += "..."
        var cursor = "";
        for (var i=0; i < pre.length; i+=1) cursor += " ";
        cursor += "^";
        if (maxPos > pos) {
            var max = maxPos-pos>40? 42 : maxPos;
            for (var i=pos+1; i < max; i+=1) cursor += " ";
            cursor += "^";
        }
        var report;
        if (start_name == "__grit__grammar") {
            report = "*** grammar rule syntax err, line:"+lx+
                    "\n"+show+"\n"+cursor;
        } else {
            report = "*** grammar '"+start_name+"' parse "+msg+
                    "\n'"+maxRule+"' at line:"+lx+
                    "\n"+show+"\n"+cursor;
        };
        if (!options || (!options.silent && !options.console)) {
            throw new Error(report);
        } else if (options.console && !options.silent) {
            console.log(report);
        } else { // silent reporting...
            options.report = report;
        }
        return [null, pos];
    }

    function line_of(pos) {
        let ln = 1, col = 0;
        for (let i = 0; i <= pos; i+=1) {
            const char = input[i];
            if (char === "\n") {
                ln += 1;
                col = 0;
            } else if (char === "\r") { // \r\n?
                if (i < pos && input[i+1] === "\n") i += 1;
                ln += 1;
                col = 0;
            } else col += 1;
        };
        return [ln, col];
    }

    function replay() {
        try {
            parser(code, input, actions, {trace:true});
        } catch(err) {
            // console.log(err);
        }
    }

    function posit(n) {
        // console.log("posit", pos, n);
        pos = n;
    }

    var cache = {};

    function run_action(result, parse) {
        var fn = null;
        var {name, action} = parse; // {name, action, pos, input, posit, env}
        if (action) {
            var ax = action.match(/^\s*(\S+)/);
            act = ax? ax[1] : "";
            fn = actions[act] || std_actions[act];
            if (!fn) { // synthetic action: _x_ etc..
                if (act.match(/^[_x]+$/) && Array.isArray(result)) {
                    var res = [];
                    result.forEach((x, i) => {
                        var k = act[i];
                        if (k === "x") res.push(x);
                    });
                    if (res.length === 1) return res[0];
                    return res;
                } else if (act) { // undefined action name...
                    report(`Missing action: '${act}' for rule: '${name}' ...`);
                }            
            }
        } // action
        const action_function = fn || actions[name] || actions["?"];
        if (action_function) {
            try {
                return action_function(result, parse);
                // return fn(result, {...parse, _:parse, $:parse.cache });
            } catch(err) {
                report("Bad action for '"+name+"':\n"+err);
            }
        }
        return result // [name, result] // default result..
    }


} // parser

// -- built-in semantic actions ---------------------------------------------

const std_actions = {

    yfx: ([x, ys]) => // x (op y)* => [op,x,y]
        ys.reduce((y, [op, z]) => [op, y, z], x),

    xfy: function xfy([x, ys]) {
        if (!ys || ys.length < 1) return x;
        let [[op,y], ...zs] = ys;
        return [op, x, xfy([y, zs])];
    },

    yfy: ([a, bs]) => { // a (op b)* => [a,op,b,op,c,...]
        return bs.reduce((y, b) => y.concat(b), [a])
    },

    xfx: ([a, bs]) => { // a (_ b)* => [a,b,c,...]
        return bs.reduce((y, [_, b]) => y.concat(b), [a]);
    },

    _x: ([_,x]) => x,

    flatten: (xs) => flatten(xs),

    string: (xs) => string(xs),

    number: (xs) => Number(string(xs)),

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

// == Operator expression function ==============================

function operex(...op_spec) { // => opex parser function

    const opdef = encodeOps(op_spec);

    /* == operator defintions ==
        const opex = operex(
            ["fy", "+", "-"],   // prefix, tightly bound
            ["xfy", "^"],
            ["yfx", "*", "/"],
            ["yfx", "+", "-"],
            ["xfy", "="]         // loosely bound
        );

        The operators are encoded into an op key map: opdef,
        indexed n = 1,3,5,7,..., binding strength, tighest = 1
        binding strengths: [prefix, left, right, suffix]:
            fx =>  [n,0,0,0];
            fy =>  [n+1,0,0,0]; 
            xfx => [0,n,n,0];   // [pfx,left,right,sfx]
            yfx => [0,n+1,n,0];
            xfy => [0,n,n+1,0];
            xf =>  [0,0,0,n];
            yf =>  [0,0,0,n+1];

        opdef = {
            "+": [1,8,7,0],  // fy , yfx
            "-": [1,8,7,0],
            "^": [0,3,4,0],  // xfy left < right
            "*": [0,6,5,0],  // yfx left > right
            ...
        }

        node = [op, left, right]
            left == null => prefix
            right == null => suffix
    */
    const nodePower = (node) => {
        if (!Array.isArray(node)) return 0;   // e.g operad
        let [op, left, right] = node;
        if (!opdef[op]) return 0;             // e.g "()"
        if (!left) return prefixPower(op);
        if (!right) return suffixPower(op);
        return infixRight(op);
    }  
    const prefixPower = (op) => opdef[op][0];
    const infixLeft = (op) => opdef[op][1];
    const infixRight = (op) => opdef[op][2];
    const suffixPower = (op) => opdef[op][3];

    const isPrefix = (op) => opdef[op] && opdef[op][0]>0;
    const isInfix = (op) => opdef[op] && opdef[op][1]>0;
    const isSuffix = (op) => opdef[op] && opdef[op][3]>0;

    const is_fy = (op) => opdef[op][0]%2==0;
    const is_yf = (op) => opdef[op][3]%2==0;

    const isOp = (op) => opdef[op];
    const notOp = (op) => !opdef[op];


    // -- encode operators ---------------------------------------------------

    function encodeOps(ops) {
        const opdef = {};
        ops.map((op, i) => { // eg  op = ["yfx", "+", "-"]
            const n = 2*i+1; // 2,4,6,8,...
            op.slice(1).map((sym) => {
                const defn = opdef[sym] || [0,0,0,0];
                const type = op[0];
                if (type === "fx") defn[0] = n;
                else if (type === "fy") defn[0] = n+1;
                else if (type === "xfx") {defn[1] = n; defn[2] = n; }
                else if (type === "xfy") {defn[1] = n; defn[2] = n+1; }
                else if (type === "yfx") {defn[1] = n+1; defn[2] = n; }
                else if (type === "xf") defn[3] = n;
                else if (type === "yf") defn[3] = n+1;
                opdef[sym] = defn; 
            });
        });
        return opdef;
    }

    const op_type = (op) => { // decode...
        const defn = opdef[op];
        if (!defn) return "undefined";
        var sign = "";
        if (defn[0]>0) sign += defn[0]%2==0? "fx":"fy";
        if (defn[1]>0 && defn[1]==defn[2]) sign += " xfx";
        if (defn[1]<defn[2]) sign += " xfy";
        if (defn[1]>defn[2]) sign += " yfx";
        if (defn[3]>0) sign += defn[0]%2==0? " xf":" yf";
        return sign;
    }


    // -- parser ---------------------------------------------------

    function opex(xs) { // xs = tokens...
        //     console.log("opex",xs);
        var tree=[], pos=0;

        if (xs.length === 0) return "";
        if (xs.length === 1) return xs[0];

        // p=prefix, i=infix, s=suffix, x,y=operands
        // valid:  p* x (s* (i p* y)?)? 
        tree = prefixed(); // tree = p* x

        while (pos < xs.length) { // valid: s* (i p* y)?
            var op = xs[pos++];
            if (isSuffix(op) && (!isInfix(op) || !xs[pos] || isOp(xs[pos]))) {
                tree = insertSuffix(tree, op);
                continue;
            }
            if (!isInfix(op)) { // (i p* y)?
                let msg = `expecting infix operator, found: '${op}' ${op_type(op)}`;
                fault(tree, [op], msg);
            }
            var y = prefixed();
            tree = insertInfix(tree, op, y);
        }
        return tree

        function prefixed() { // p* x => 
            var k = pos;
            while (k<xs.length && isPrefix(xs[k])) k+=1;
            if (isOp(xs[k])) { // p* !x
                let msg = `expecting operand, found: '${xs[k]}' ${op_type(op)}`;
                fault(tree, xs.slice(pos,k+1), msg);
            }
            if (k === pos) return xs[pos++]; // x
            var pfx = xs[pos++];
            var result = [pfx, null, xs[pos++]];
            return prefixChain(result, k);
        }
        function prefixChain(node, k) { // p+ x => p(p(..p(x))..)
            if (pos > k) return node;
            var [pfx1, _, pfx2] = node;
            if (prefixPower(pfx1) > prefixPower(pfx2)) {
                let msg = `prefix conflict: '${pfx1}' ${op_type(pfx1)}, '${pfx2}' ${op_type(pfx2)}`;
                fault(tree, xs.slice(pos-1,pos+1), msg);
            }
            node[2] = prefixChain([pfx2, null, xs[pos++]], k);
            return node;
        }

    } // opex

    const insertInfix = (tree, op, z, m = infixLeft(op)) => {
        let n = nodePower(tree);
        if (n < m || !tree[2]) return [op, tree, z];
        if (isLeaf(tree[2])) {
            tree[2] = [op, tree[2], z];
            return tree;
        }
        if (n > m) {
            tree[2] = insertInfix(tree[2], op, z, m);
            return tree;
        }
        fault(tree, [op, z], `invalid '${op}' ${op_type(op)}`);
    }

    const insertSuffix = (tree, sfx, m = suffixPower(sfx)) => {
        let n = nodePower(tree);
        if (n < m || !tree[2]) return [sfx, tree, null];
        if (isLeaf(tree[2])) {
            tree[2] = [sfx, tree[2], null];
            return tree;
        }
        if (n > m) {
            tree[2] = insertSuffix(tree[2], sfx, m);
            return tree;
        }
        if (n === m && is_yf(sfx)) { // must be yf
            tree[2] = [sfx, tree[2], null];
            return tree;
        }
        fault(tree, [sfx, null], `invalid '${sfx}' ${op_type(sfx)}`);
    }

    const isLeaf = (x) => !x || !Array.isArray(x) || notOp(x[0]);

    const fault = (tree, rest, msg) => {
        const ast = JSON.stringify(tree);
        throw new Error(`Bad op expr: ${msg}\n${ast} ${rest.join(" ")}`);
    }

    return opex;
} // operex
    
// -- grit_parser --------------------------------------------------------

function grit_parser (grammar, actions) {

    let [code, _] = parser(grit_code, grammar, grit_actions)

    if (!code) return null;
    
    resolve_code(code);

    function parse(input, options) {
        const [result, pos] = parser(code, input, this.actions, options);
        this.result = {input, pos, result};
        return result;
    };

    function match(input, options) {
        try {
            var result = this.parse(input, options);
        } catch(err) {
            this.err = err;
            return null;
        }
        return result;
    }

    return {parse, match, grammar, actions, code};
}


// expose grit_parser ----------------------------------------------

grit_parser.operators = operex;

// module.exports = grit_parser;

if (typeof module !== 'undefined' && typeof exports === 'object') {
    module.exports = grit_parser;
} else if (typeof define === 'function' && define.amd) {
    define(function() { return grit_parser; });
} else {
    this.grit_parser = grit_parser;
}

}).call(function() {
return this || (typeof window !== 'undefined' ? window : global);
}()); // outer funtion name-space wrapper
    
    
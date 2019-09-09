#   Grammar Paser Reference Guide

The JavaScript implementation of the `grammar_parser` function is a single file with no dependencies. It uses the standard RegExp constructor to build its regex components.

Example usage, with a local copy of the `grammar-parser.js` file:

``` eg
    const grammar_parser = require("./grammar-parser.js");

    const cvs_rules = String.raw`
        table  = row+
        row    = cell ("," cell)* nl?
        cell   = [^,\n\r]*
        nl     = [\n] / [\r][\n]?
    `;

    const cvs = grammar_parser(cvs_rules);

    var test = `
    a1,b1,c1
    a2,b2,c3
    a3,b3,c3
    `;

    var parse_tree = cvs.parse(test);

    console.log(JSON.stringify(parse_tree, null, 2));
```




##  PEG Rules

A grammar rule names a PEG expression which may contain string matching components. 

An expression `e` may be either:

*   a rule name reference -- to match the expression defined by that rule.
*   a string match component -- to directly match the input text.

If `e1` and `e2` are PEG expressions, then so too is:

*   `e1 e2`    -- to match a sequence of e1 followed by e2
*   `e1 / e2`  -- which matches e1, or e2 if and only if e1 fails
*   `( e1 )`   -- to form a group

The choice `e1 / e2` will only try `e2` if `e1` fails (first match wins), and there is no backtracking.

*   `e1 / e1 e2`  -- will therefore never match the second alternative.

An empty match is not a failure, so: `e1* / e2` should never try to match e2. But in practice it is very easy to make this kind of mistake, and there seems to be no practical reason not to treat a match of nothing the same as a failure. So this is treated as a special case, and the parser will try to match `e2` if `e1` has not matched any input. 

Any PEG expression e can be given a predicate prefix:

*   `&e` returns `[]` if e matches, else it fails. No input is consumed.
*   `!e` returns `[]` if e does NOT match, else it fails. No input is consumed.

Any PEG expression e can be given a repeat suffix:

*   `e*` results in an array with zero or more matches.
*   `e+` results in an array with one or more matches.
*   `e?` will either match `e` or an empty array `[]`.

The result of a repeat is always the longest match and no other.

*   `e* e`  -- will therefore always fail to match any input.

The binding strength or precedence is (low to high):

*   `e1 / e2`
*   `e1 e2`
*   `&e !e`
*   `e* e+ e?`

So, for example:

*   `e1 e2* / e3 (e4 / e5+)*  =>  ((e1 e2*) / (e3 (e4 / e5+)*))`

The result from a rule, by default, is an array with the rule name as the first element and the result of matching its expression (the body of the rule) as the second element:

*   `[rule_name, rule_result]`


##  String Matching Components

A string matching component in a grammar rule can be either:

*   A literal quoted "string" or 'string' to be matched.
    - there are no escape codes.
    - any leading white-space will be skipped.

*   A regex to match a regular expression.
    - a regex must start with `[ or \`
    - for example: `[abc] or \d`
    - suffix repeats can be included in the regex, eg: `[abc]* or \d+`
    - a regex will not skip leading white-space
    - after the start the regex is not restricted, it can be almost anything
    - for example: `[abc]*(\s*\d+)*`
    - the complete regex is evaluated as a single regular expression
    - a regex can not contain any white-space, except in brackets, eg: `[ \t]*`
    - the result is the full matched string, or the first capture group if there is one.

Note that quoted literal `"x"` and the regex `[x]` will both match a literal character `x`, but  `"x"` will skip any leading white-space, so `"x"` is equivalent to the regex: `\s*(x)`

The regex components should be kept simple, such as a char-set eg: `[abc]`, or a repeated char-class eg: `\d+`. There is no loss of expressive power in keeping the regex matches simple since they are components in a larger PEG grammar. PEG logic can be used for lookahead tests eg: `&x` for positive lookahead tests, or `!x` for negative lookahead tests.

If necessary a semantic action can be used as an escape hatch to match anything.

Simple regex components also eliminates troublesome issues with some regular expression implementations, see [Russ Cox] for details.


##  Grammar Grammar

The grammar rules can define themselves. Here is a minimal grammar that is sufficient to define itself and parse itself:

``` eg
    grammar = (ws rule ws)+
    rule    = name ws [=] expr

    expr    = seq (ws [/] seq)*
    seq     = ([ ]* term [*+?]?)*
    term    = name / match / group

    name    = [\w]+
    match   = [[] [^\x5D]+ [\x5D] [*+?]?
    group   = [(] expr [)]

    ws      = [\s]*
```
This grammar only accepts simple regex char-set string match components. 

Here is the full `grammar_parser` definiton:

``` eg
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

    act     = ":" [ \t]* \w+ lines
    lines   = line (\s* !\S+\s*= line)*
    line    = [^\n\r]* 
    ws      = \s*  
```

##  Semantic Actions

A semantic action function name may be appended to to a rule with a `:` separator.

Custom semantic action functions can be defined in the host programming languiage and passed into the the grammar_parser function along with the grammar rules.

If the rule has an attached semantic action function name that matches a custom function then that function will be given the rule match results. The result from the rule will then be the result of the semantic action function. 

If the semantic action returns `null` then the rule will fail, any other result can be used as the rule result.

If the rule has a semantic action function name that does not match a custom function then it may match a standard built-in function name.

If a rule has no attached semantic action, but there is a custom fuction with the same name as the rule, then this custom function will be applied to the results of this rule.

### Built-in Functions

The built-in functions:

* yfx returns a left associative tree.  e.g.  `1+2+3 => (1+2)+3`
* xfy returns a right associative tree.  e.g. `2^3^4 => 2^(3^4)`
* xfx returns a flat list excluding the operators. e.g. `1+2+3 => 1 2 3`
* yfy returns a flat list including the operators. e.g. `1+2+3 => 1+2+3`
* string converts the result into a string.
* number converts the result into a number.
* x is any result (without the default rule name label).
* _ means ignore this result.

The `yfx` and `xfy` actions generate parse tree nodes in this form:

``` eg
    [rule_name, left_tree, right_tree]
```

Here they are used to generate the desired parse tree for our arithmetic expression grammar:

``` sandbox
const arith = String.raw`
  expr   = factor ([+-] factor)*   : yfx
  factor = term ([*/] term)*       : yfx
  term   = prime ("^" prime)*      : xfy
  prime  = numb / group            : x
  group  = "(" expr ")"            : _x_
  numb   = \d+                     : number
`;

const expr = grammar_parser(arith);

write( expr.parse(`1+2+3+4+5`) );

write( expr.parse(`2^3^4`) );

write( expr.parse(`1+2+3*(4+5)-6`) );

```
The tree structures:

``` box
              +                 ^          
             / \               / \         
  yfx:      +   4      xfy:   1   ^        xfx:  1 2 3 4    yfy:  1 + 2 + 3 + 4 
           / \                   / \
          +   3                 2   ^    
         / \                       / \
        1   2                     3   4     
```

The semantic actions can be thought of as a sort of type specification for the rule result, which can be appended to the end of the rule.

### Custom Functions

Custom functions are written as methods in an object that is passed into the `grammar_parser` function.

For development debugging the action function can be used to log the results matched by a rule. 

``` sandbox
const rules = String.raw`
    S    =  "a" [b]+ 'c'* nums
    nums = (\s* \d+)*
`;

const actions = {
    S: (x) => {
        console.log('x=',x);
        // return null; // rule fails
        return x;
    }
};

const test = grammar_parser(rules, actions);

var p = test.parse("abbcc 123 456");

write(p);
````

An example with semantic functions that translate the parse tree:

``` sandbox
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
  term:   (x) => Number(x) || x[1]
}

const expr = grammar_parser(arith, evaluate);

var e = expr.parse("1+2*(3+4)-5");

write(e);
````

The action functions are called with two arguments:

*   The rule result -- this is usually all that is required.
*   A parse object: { name, action, pos, input, posit}
    - name: the rule name
    - action: the action appended to the rule
    - pos: the current input position (after the rule match)
    - input: the input string being parsed
    - posit(i): a function to set a new position.

The rule result is usually all that is needed, but the parse parameter gives the action function access to information that can be useful for debugging, or for experimental actions (extending the buit-in functions), or even to take over for special case parsing if necesserary. 



##  Debug Trace

The `parse` function has a second argument for options, which can generate a trace log to help debug a grammar. 

Here is an example of using a trace:

``` eg
    const arith = String.raw`
        expr   = factor ([+-] factor)*
        factor = term ([*/] term)*
        term   = \d+ / "(" expr ")"
    `;
    const expr = grammar_parser(arith);

    var e = expr.parse("1+2*(3+4)-5", {trace: true} );

    0..1 term /\d+/y =>1
    1 factor /[*\/]/y !
    1..2 expr /[+-]/y =>+
    2..3 term /\d+/y =>2
    3..4 factor /[*\/]/y =>*
    4 term /\d+/y !
    4..5 term /\s*(\()/y =>(
    5..6 term /\d+/y =>3
    6 factor /[*\/]/y !
    6..7 expr /[+-]/y =>+
    7..8 term /\d+/y =>4
    8 factor /[*\/]/y !
    8 expr /[+-]/y !
    8..9 term /\s*(\))/y =>)
    9 factor /[*\/]/y !
    9..10 expr /[+-]/y =>-
    10..11 term /\d+/y =>5
    11 factor /[*\/]/y !
    11 expr /[+-]/y !

```
The numbers on the left are the input position of the match components with the name of the rule the component is in. Only the input match operations are logged in the trace, they usually give the most useful information, and a full trace of all rules can be very verbose.  





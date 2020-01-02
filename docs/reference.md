#   Grit Grammar Parser Reference

This reference guide is for the the NPM `grit-parser` package.

Project repository: <https://github.com/pcanz/grammar-parser>


##  PEG Rules

A grammar rule names a PEG expression that contains string pattern matching components. 

A PEG expression `e` may be either:

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

*   `&e` matches an empty string `''` if e matches, else it fails. No input is consumed.
*   `!e` matches an empty string `''` if e does NOT match, else it fails. No input is consumed.

Any PEG expression e can be given a repeat suffix:

*   `e*` results in an array with zero or more matches.
*   `e+` results in an array with one or more matches.
*   `e?` will either match `e` or an empty string `''`.

The result of a repeat is always the longest match and no other.

*   `e* e`  -- will therefore always fail to match any input.

The binding strength or precedence is (low to high):

*   `e1 / e2`
*   `e1 e2`
*   `&e !e`
*   `e* e+ e?`

So, for example:

*   `e1 e2* / e3 (e4 / e5+)*  =>  ((e1 e2*) / (e3 (e4 / e5+)*))`


##  String Matching Components

A string matching component in a grammar rule can be either:

*   A literal quoted "string" or 'string' to be matched.
    - there are no escape codes.
    - double-quote marks (but not single-quote mrks) will skip surrounding white-space.

*   A regex to match a regular expression.
    - a regex must start with `[` or `\` or `^`
    - for example: `[abc]` or `\d` or `^(abc)`
    - suffix repeats can be included in the regex, eg: `[abc]*` or `\d+`
    - after the start the regex is not restricted (it can be any valid RegExp)
    - for example: `[abc]*(\s*\d{3,4})*`
    - the complete regex is evaluated as a single regular expression
    - a regex can not contain any white-space, except in brackets, eg: `[ \t]*`
    - the result is the full matched string, or the first capture group if there is one.

Note that quoted literal `"x"` and the regex `[x]` will both match a literal character `x`, but  `"x"` will skip any surrounding white-space, so `"x"` is equivalent to the regex: `\s*(x)\s*`

    'a+b+c' => regex: [a]\+b\+c
    "a+b+c" => regex: \s*(a\+b\+c)\s*

A `^` in a regex will only match at the beginning, but since each regex component is treated as a separate match it is not necesary to use a `^` at the start of a regex component (but it does no harm). Since any regex *may* begin with a `^` is can be used to introduce any regex component, for example, `^(x)+` is a regex to match one or more x characters, but `(x)+` is not a regex, it will match a list of one or more `x` rules.

Ideally the regex components should be kept simple, such as a char-set eg: `[abc]`, or a repeated char-class eg: `\d+`. There is no loss of expressive power in keeping the regex matches simple since they are components in a larger PEG grammar. The PEG logic can include lookahead tests eg: `&x` for positive lookahead tests, or `!x` for negative lookahead tests, or a semantic action can be used.

Simple regex components also eliminate troublesome issues with some regular expression implementations, see [Russ Cox] for details.

[Russ Cox]: https://swtch.com/~rsc/regexp/regexp1.html

##  Semantic Actions

Semantic actions are functions that are appled to the result of a rule match. The actions are defined as properties of an object, which can be assigned to the `actions` property of a parser:

``` sandbox
const mdy = grit`
    date  = month '/' day '/' year
    day   = \d+
    month = \d{1,2}
    year  = \d{4}
`;

mdy.actions = {
    date: ([m, _, d, _1, y]) => new Date(y, m-1, d),
    day: (d) => Number(d),
    month: (m) => Number(m),
    year: (y) => Number(y)
}

var dt = mdy.parse("3/4/2019");

write(dt);
---
const grammar = String.raw`
    date  = month '/' day '/' year
    day   = \d+
    month = \d{1,2}
    year  = \d{4}
`;

const actions = {
    date: ([m, _, d, _1, y]) => new Date(y, m-1, d),
    day: (d) => Number(d),
    month: (m) => Number(m),
    year: (y) => Number(y)
}

const mdy = grit(grammar, actions);

var dt = mdy.parse("3/4/2019");

write(dt);
```
The function name corresponding to the rule name will be called with the result matched by that rule.

The grit grammar parser constructor function may also be called with two arguments: the grammar rules, and the action functions, as in example 1.2.

The name of a semantic action function may be appended to a rule with a `:` separator:

``` sandbox
const mdy = grit`
    date  = month '/' day '/' year : date
    day   = \d+                    : num
    month = \d{1,2}                : num
    year  = \d{4}                  : num
`;

mdy.actions = {
    date: ([m, _, d, _1, y]) => new Date(y, m-1, d),
    num: (n) => Number(n)
}

var dt = mdy.parse("3/4/2019");

write(dt);
---
const grammar = String.raw`
    date  = month '/' day '/' year : date
    day   = \d+                    : num
    month = \d{1,2}                : num
    year  = \d{4}                  : num
`;

const actions = {
    date: ([m, _, d, _1, y]) => new Date(y, m-1, d),
    num: (d) => Number(d)
}

const mdy = grit(grammar, actions);

var dt = mdy.parse("3/4/2019");

write(dt);
```

If the semantic action returns `null` then the rule will fail, otherwise the action may return any result as the rule result.

If the rule has a semantic action function name that does not match a custom function then it may match a standard built-in function name.

An application program can always process the default parse tree without using any semantic actions(in that case the parse tree result will be an array of arrays of string values). But it is often more convenient to break the parse tree processing into smaller functions applied to the result of an individual rule.

For example, a calculator application could process the parse tree for arithmetic expressions, but it is simpler to break the calculator application into semantic action functions that incrementally process the results of individual grammar rules:

``` sandbox
const arith = grit`
  expr   = factor ([+-] factor)*
  factor = term ([*/] term)*
  term   = \d+ / "(" expr ")"
`;

arith.actions = {
  expr:   ([f, fs]) =>
            fs.reduce((y, [op, x]) =>
              op === '+'? y+x : y-x, f),   
  factor: ([t, ts]) =>
            ts.reduce((y, [op, x]) =>
              op === "*"? y*x : y/x, t),
  term:   (x) => Number(x) || x[1]
}

var e = arith.parse("1+2*(3+4)-5");

write(e);
````

The action functions are called with two arguments:

*   The rule result -- this is usually all that is required.
*   A parse object: `{ name, action, pos, input, posit}`
    - name: the rule name
    - `action`: the action appended to the rule
    - `pos`: the current input position (after the rule match)
    - `input`: the input string being parsed
    - `posit(i)`: a function to set a new position.

The second argument parse object is not often needed, but it gives the action function access to information that can be useful for debugging, or for experimental actions (extending the buit-in functions), or even to take over for special case parsing if necesserary.

It is good practice to first develop a grammar parser without using any semantic action functions. This first priority is to ensure that the grammar rules recognise input strings correctly, regardless of the structure of the parse tree. After that the rules may be reorganized to simplify the parse tree, and finally semantic actions may be employed to process the parse tree as needed by the application.

It is important to remember that a semantic action may be called before the rule later fails as a component in another rule. This is too late for any side effects the semantic action may have generated.


### Built-in Functions

The built-in functions:

* `string` converts the result into a string.
* `number` converts the result into a number.

Synthetic `x_xx_x` function names can be used to select `x` or skip `_` components in a rule result.

Rules of this form: `x (op x)*` are an idiomatic way to mastch lists with separators, or arthmetic expressions, and many other formats. These rules generate an awkward parse tree structure which can be simplified by these standard functions:

* yfx returns a left associative tree.  e.g.  `1+2+3 => (1+2)+3`
* xfy returns a right associative tree.  e.g. `2^3^4 => 2^(3^4)`
* xfx returns a flat list including the operators. e.g. `1+2+3 => 1 + 2 + 3`
* yfy returns a flat list including the operators. e.g. `1+2+3 => 1 2 3`

The `yfx` and `xfy` actions generate parse tree nodes in this form:

``` eg
    [op, left_tree, right_tree]
```

Here they are used to generate the desired parse tree for our arithmetic expression grammar:

``` sandbox
const expr = grit`
  expr   = factor ([+-] factor)*   : yfx
  factor = term ([*/] term)*       : yfx
  term   = prime ("^" prime)*      : xfy
  prime  = numb / group            : x
  group  = "(" expr ")"            : _x_
  numb   = \d+                     : number
`;

write( expr.parse(`1+2+3+4+5`) );

write( expr.parse(`2^3^4`) );

write( expr.parse(`1+2+3*(4+5)-6`) );

```
The tree structures:

``` box
              +                 ^          
             / \               / \         
  yfx:      +   4      xfy:   1   ^        xfx:  1 + 2 + 3 + 4    yfy:  1 2 3 4 
           / \                   / \
          +   3                 2   ^    
         / \                       / \
        1   2                     3   4     
```

The semantic actions can be thought of as a sort of type specification for the rule result, which can be appended to the end of the rule.


##  Debug Trace

The `parse` function has a second argument for options, which can generate a trace log to help debug a grammar. 

Here is an example of using a trace:

``` eg
    const arith = grit`
        expr   = factor ([+-] factor)*
        factor = term ([*/] term)*
        term   = \d+ / "(" expr ")"
    `;

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


##  Grammar Grammar

The grammar rules can define themselves. Here is a minimal grammar that is sufficient to define itself and parse itself:

``` sandbox
const g1 = String.raw`
    grammar = (ws rule ws)+
    rule    = name ws [=] expr

    expr    = seq (ws [/] seq)*
    seq     = ([ ]* term [*+?]?)*
    term    = name / match / group

    name    = [\w]+
    match   = [[] [^\x5D]+ [\x5D] [*+?]?
    group   = [(] expr [)]

    ws      = [\s]*
`;

var p = grit(g1).parse(g1);

print(p);

```
This grammar only accepts simple regex char-set string match components. 

Here is the full grit grammar grammar:

``` eg
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
```



``` replace
"   smart
'   smart
```

<style type="text/css">
	body {
		font-family: 'Helvetica Neue', Helvetica, Arial, serif;
		font-size: 1em;
		line-height: 1.5;
		color: #505050;
	}
	code.language-eg { display:block; background:whitesmoke; margin:0pt 10pt;}
</style>




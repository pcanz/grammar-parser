const grammar_parser = require("./grammar-parser.js");

const boot0 = String.raw`
    grammar = (ws rule ws)+
    rule    = name ws [=] expr

    expr    = seq (ws [/] seq)*
    seq     = ([ ]* term [*+?]?)*
    term    = name / match / group

    name    = [\w]+
    match   = [[] [^\x5D]+ [\x5D]
    group   = [(] expr [)]

    ws      = [\s]*
`;

/*
    rules are restricted to fit in a single line.

    match only allows [x], a very restricted regex

    Explicit white-space ws needed before [=], and [/].
    No [&!] predicate prefixes.
    Can't use: \d \w etc, instead use [\d] [\w] etc..
    Can't use [\]], instead use [\x5D]
    No quotes "abc".

    Uses [ ]*, since allowing \s* would require a rule
    name ref = \w+ \s* ![=] to prevent rule over-runs.
*/

// const grit0 = grammar_parser(boot0);

// var tree0 = grit0.parse(boot0,{trace:true});

// console.log(JSON.stringify(tree0, null, 2)); 


const boot1 = String.raw`
    grammar = (ws rule ws)+
    rule    = name "=" expr

    expr    = seq ("/" seq)*
    seq     = ([ ]* term [*+?]?)*
    term    = name / match / group

    name    = [\w]+
    match   = quote / chars
    quote   = ["] [^"]+ ["]
    chars   = "[" [^\x5D]+ "]"
    group   = "(" expr ")"

    ws      = [\s]*
`;

/*
    Adds "quote", it will skip leading ws.
    This simplifies the main rules a little.
    Rules can now be multi-line breaking before / 
    
    No [&!] predicate prefixes.
    Can't use: \d \w etc, instead use [\d] [\w] etc..
    Can't use [\]], instead use [\x5D]
    Only double quotes "abc", no single quotes 'abc'.
*/

// const grit1 = grammar_parser(boot1);

// var tree1 = grit1.parse(boot1,{trace:true});

// console.log(JSON.stringify(tree1, null, 2)); 


const boot2 = String.raw`
    grammar = (ws rule ws)+
    rule    = name "=" expr

    expr    = seq ("/" seq)*
    seq     = ([ ]* term [*+?]?)*
    term    = name / match / group

    name    = [\w]+
    match   = quote / chars
    quote   = '"' [^"]* '"' / "'" [^']* "'"
    chars   = "[" ([^\x5C\x5D]*([\x5C][^])?)* "]"
    group   = "(" expr ")"

    ws      = [\s]*
`;

/*
    Enhance [x] chars to allow [\]]
    Add single quotes 'abc' 
    
    No [&!] predicate prefixes.
    Can't use: \d \w etc, instead use [\d] [\w] etc..
*/

// const grit2 = grammar_parser(boot2);

// var tree2 = grit2.parse(boot2,{trace:true});

// console.log(JSON.stringify(tree2, null, 2)); 


const boot3 = String.raw`
    grammar = rule+
    rule    = name "=" expr ws

    expr    = seq ("/" seq)*
    seq     = (ws [&!]? term [*+?]?)*
    term    = ref / match / group

    name    = ws \w+
    ref     = name !\s*[=]
    match   = quote / regex
    quote   = '"' [^"]* '"' / "'" [^']* "'"
    regex   = &[[\\] (chars / rex / par)*
    chars   = [[] ([^\x5C\x5D]*([\x5C][^])?)* "]"
    rex     = [^\s[()]+
    par     = [(] ([^()]* par?)* [)]
    group   = "(" expr ")"

    ws      = \s*
`;

/*
    Allow any regex that starts with &[\[]]
    Allow any rule white-space, using !\s*= 
    
*/

// const grit3 = grammar_parser(boot3);

// var tree3 = grit3.parse(boot3) //,{trace:true});

// console.log(JSON.stringify(tree3, null, 2)); 

const boot4 = String.raw`
    grammar = rule+
    rule    = name "=" expr ws

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

    ws      = \s*
`;

/*
   use !\s*= (boot3 used !\s*[=] for previous grammar_parser)
   use composite regex in: rex = rex|chars, to check that works.
*/

// chars   = [[]([^\]\\]*([\\][^])?)*[\]]

// var tree4 = grit3.parse(boot4,{trace:true});

// console.log(JSON.stringify(tree4, null, 2)); 


// boot5 used in grammar-parser-0.7 4Sept19.

const boot5 = String.raw`
    rules := rule+
    rule  := name ":"? "=" exp act?
    exp   := seq ("/" seq)*
    seq   := term+
    term  := [ \t]* [&!]? prime [*+?]?
    prime := ref / rex / group
    group := "(" exp ")"
    act   := ":" ":"? [ \t]* [^\n\r]*

    name  := [\s]* [\w]+
    ref   := [\w]+
    rex   := [~]? (quo / chs / esc / reg)+
    quo   := "'" [^']* "'" / '"' [^"]* '"'
    esc   := "\" [\S] [*+?]?
    chs   := "[" [^\x5D]+ "]" [*+?]?
    reg   := [(] (rex/reg/[/|])+ [)]

    rep   := [*+?] / [{] \d*[,]?\d*  [}]    
`;

// boot6 -- merges boot5 with boot4 ....

const boot6 = String.raw`
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
`;

/*
  boot6 is now used in grammar_parser.js -- as of 5 Sept 2019.
*/

const grit6 = grammar_parser(boot6);

var tree6 = grit6.parse(boot6,{trace:true});

console.log(JSON.stringify(tree6, null, 2)); 
    


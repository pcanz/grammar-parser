#	 Grammar Parsers

Regular expressions are a standard tool in every programmers tool-box. But grammar rules are rarley used, they seem to be reserved for specialists such as language designers and compiler writers.

This is a pity, since grammar rules make nice specifications, and they can be simpler and more expressive than regular expressions.

The traditional approach is to start with a grammar as a specification. A parser may be hand coded to match the grammar specification. Or special tools may be used to compile a suitably modified version of the grammar specification, and generate program code for a parser. 

Here we take a different approach, using grammar rules that can be directly executed in a program, in much the same way as regular expressions. These grammar rules are both simpler and more powerful than using bare regular expressions. They provide an easy way for a programmer to organize and manage their use of regular expresssions.

We will use a form of [PEG] (Parser Expression Grammar) rules, which can contain regular expression elements. The grammar rules can name other grammar rules as component parts. This will be explained shortly, but the general idea should be reasonably obvious.

[PEG]: https://en.wikipedia.org/wiki/Parsing_expression_grammar

The grammar rules can be used in almost any programming language. We will use JavaScript here in order to show running examples, and to compare grammar rules with regular expressions. To do that we will need to introduce a few programming language details, but the grammar rules themselves are independent of the host programming language.

The source code for the grammar parser used here can be found at: <https://github.com/pcanz/grammar-parser>


##  A First Example

The first example is to match a date format, such as "3/4/2019", which some people see as the 3rd of April, and others as the 4th of March. If we ignore the semantics, the syntax is almost trivial, and our first task is simply to match the pattern in this date format.

First we will look at a standard regular expression to match a date pattern:

``` sandbox
const date_rule = String.raw`(\d+)/(\d+)/(\d+)`;

const date_regex = new RegExp(date_rule);

var date_match = date_regex.exec("3/4/2019");

write(date_match); // ===>

```

The JavaScript `String.raw` function is used to avoid the need to escape any back-slash characters in the text string for the regular expression.

In JavaScript the regular expression could of course be written as:
``` eg
    const date_regex = /(\d+)\/(\d+)\/(\d+)/;
```
The regular expression has been written as a text string so that it is directly comparable with this grammar rule version:

``` sandbox
const date_rule = String.raw`
  date = \d+ '/' \d+ '/' \d+
`;

const date_parser = grammar_parser(date_rule);

var date_match = date_parser.parse("3/4/2019");

write(date_match); // ===>

```
The `grammar_parser` function corresponds to the `RegExp` object, it is a function that takes the grammar rules as input and returns a parser function.

The date grammar rule is quite similar to the date regular expression rule, the big difference is that the grammar rule is given a name (before the `=` symbol), and the rule use white-space to separate the component parts.
``` eg
    regular expression:  (\d+)/(\d+)/(\d+)
    grammar rule:        date = \d+ '/' \d+ '/' \d+
```
The component parts can include a quoted string for a literal match, or a *regex* regular expression. A regex component uses the standard regular expression syntax for a back-slash character class, or for a character-set in square brackets (not used in this example).

The first example was written so that the grammar rule version corresponded closely to the regular expression version. But grammar rules really come into their own when the component parts are split out into separate named rules:

``` sandbox
const mdy_rules = String.raw`
    date  = month '/' day '/' year
    day   = \d+
    month = \d+
    year  = \d+
`;

const mdy = grammar_parser(mdy_rules);

var date_match = mdy.parse("3/4/2019")

write(date_match)
```
This version matches exactly the same syntax, but the grammar rule names now indicate the semantic intent for this grammar. The parser function has been given a short name `mdy` to stand for the type of text it represents, but it could be given a longer name such as `date_parser`.

The grammar rules are a text string, and the `grammar_parser` function returns a parser function. The result of applying the parser function to an input text string is, by default, a simple JSON data structure with a nested array of string values. The rule names label the results that they matched.

The date grammar in this example has has been kept as simple as possible to illustrate how things work. In practice a more accurate date grammar could be used, for example it could require that the year has exactly four digits and the month and day have only one or two digits.

For a slightly larger example we will look at parsing a URI into its component parts. Of course there are library parser functions to decode a URI, and these are the best way to do this particular job. The URI format simply provides a familar example in order to demonstrate the grammar rule approach.

First using a regular expression:

``` sandbox
const uri_regex = String.raw
`^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?`;

const URI = new RegExp(uri_regex);

var input = "https://host/path/file/foo.txt";

var matched = URI.exec(input);

write(matched);
```
Now using a grammar:

``` sandbox
const uri_rules = String.raw`
  uri    = scheme? host? path query? frag?
  scheme = [^:/?#]+ ':'
  host   = '//' [^/?#]*
  path   = [^?#]*
  query  = '?' [^#]*
  frag   = '#' [^\s]*
`;

const URI = grammar_parser(uri_rules);

var input = "https://host/path/file/foo.txt";

var matched = URI.parse(input);

write(matched);
```
The grammar rules employ exactly the same regular expression, but split apart into named components. The advantage of using a grammar instead of a bare regular expression should now be clear. The grammar rules are simpler and easier to understand, and the parser can efficiently knit together the small regular expression components.

You can edit the examples and hit the `RUN` button to see what happens. For example, try adding a fragment to the input URI example. Or edit the grammar rules to play with them. If you replace the `write` with a `print` you will see the output in a different format.


##  Grammar Rules

A grammar rule can be used to match a list with any number of items, whereas a regular expression is more restricted in that it must spell out each item to be matched.

For example, to match numbers in an addition list the best we can do with a regular expression is something like this:

``` sandbox
const sum_regex = String.raw
  `^(\d+)([+]\d+)?([+]\d+)?([+]\d+)?`;

const sum = new RegExp(sum_regex);

var matched = sum.exec("1+2+3");

write(matched)

```
A grammar rule does not have this restriction, it can match any number of items:

``` sandbox
const sum_rule = String.raw`
  add = \d+ ("+" \d+)*
`;

const sum = grammar_parser(sum_rule);

var parsed = sum.parse( "1+2+3+4+5" );

write(parsed);
```
To use regular expressions for this kind of task really needs a program to repeatedly match a regular expression for a single item and build a list of the matched items. A grammar rule can do that efficiently, without the need for any extra program code.

The result from the RegExp version is an array with the full match followed by the matched item (the bracket capture groups).

The result from a grammar-parser version is an array of the matched items, but in this case it is a nested tree structure, and the rule name is included as a label for the list of items that it has matched. This tree structure can be called a parse tree or an abstract syntax tree.

The parse tree results may look a little verbose, but the tree structure is quite easy for an application program to navigate. There are no special programming object types involved, the parse tree is a simple JSON data structure that can be implemented in almost any programming language.

Now for a more realistic example, reading a file of CSV (Comma Separated Variable) data, such as output from a spread-sheet application. The CSV format is simple enough, each line of text is a row in a table, using a comma separator between each column cell.

``` sandbox
const csv_grammar = String.raw`
    table = nl* row+
    row   = cells nl*
    cells = cell (',' cell)*
    cell  = [^,\n\r]*
    nl    = \n / \r\n?
`;

const csv = grammar_parser(csv_grammar);

var arr = csv.parse("a1,a2,a3\na2,b2,c2\n")

write(arr)
```
This is the first time we have seen a choice operator, using the `/` symbol. It serves the same purpose as the regex `|` choice operator, and it is used here for the mundane task of accepting different end-of-line conventions.

The first CSV grammar is a little too simple, it needs to be extended to allow a cell field to contain a comma character. We will follow the RFC 4180 standard (Common Format and MIME Type for CSV Files  October 2005). In this format fields that contain a comma are put inside quote marks, and inside the quotes any other quote marks are doubled. Here are the extended grammar rules:

``` sandbox
const CSV_grammar = String.raw`
  csv     = nl* record+
  record  = fields nl*
  fields  = field (',' field)*
  field   = escaped / txt
  escaped = esc+
  esc     = ["] [^"]* ["]
  txt     = [^,"\n\r]*
  nl      = \n / \r\n?
`;

const CSV = grammar_parser(CSV_grammar);

var input = `
a,b,c
d,"e,""f",g
`;

var output = CSV.parse(input);

write(output);
```

The parse tree is getting hard to read, but it is a simple data structure that an application program can process without much difficulty. The parse tree can be simplified and formatted for easier reading if necessary, but the firt priority should be to ensure that the grammar rules recognize the desired syntax and match the input text correctly.


##  Grammar Rule Logic

We have seen how the PEG logic in the grammar rules can match a sequence of components, or a make a choice between different alternative components, and components may have a repeat quailifier suffix. It is very similar to the way a regex works, aside from the white-space (that is otherwise insignificant) used to separate components in a grammar rule.

However, the grammar rule operators are not exactly the same as the regex operators. Users do need to be aware that PEG logic is not the same as regex logic. A grammar rule can contain a hybrid mix of the two, but regex logic only applies inside a regex component, outside that its all PEG logic.

The PEG `/` choice operator is simpler than a regular expression `|` choice operator, it will match the first choice it can, and it will only try to match the next choice if the preceeding choice has failed. There is no back-tracking to try again later

The repeat operators: *, +, ? are also simpler than the regex operators since they can only match in one way, giving the maximum length match.

A simple regex component with a repeat suffix can not be logically distinguished from a PEG repeat operator (since there is no backtracking to let the regex try again). It is best to keep regex components simple, but a more complex regex component can be used, and they may employ regex logic internally. A regex component returns a string match result.

The lack of backtracking in the PEG logic can make it quite different from a regex. For example, here is a sequence of two regex components in a grammar rule that will fail to match an input that the same two components could match, if they were combined into a single regex:

``` eg
    [ab]+ [bc]+  -- fails on: "abb" (the [bc]+ finds nothing left to match).

    [ab]+[bc]+ -- will math: "abb" (after backtracking the [bc]+ will match the last b).
```
In this next PEG rule the second choice will never match anything:

``` eg
    x y* / x z*  -- only the first choice will ever match.

    xy*|xz* -- as a regex the xz* may match some input (after backtracking).
```
A PEG choice is deterministic, if the first choice matches then the second choice will not be tried. The regex is nondeterministic, it can try both choices to find any possible match. The PEG determinism is exactly what we want in order to recognise unambiguous computer languages (as against ambiguous natural languages).

Despite the fact that the grammar rule operators are simpler than their regular expression counterparts they can be used to match anything that a regular expression can match.

The grammar rules can go beyond a regular rexpression since they can call each other recusively. This gives them the added power to parse a nested syntax. In fact the PEG rules can be used to match the syntax for any context free language (i.e. the kind of syntax most computer programming languages are based on).


##  Parse Trees

A grammar-parser makes grammar rules a practical tool that can be used to simplify the use of bare regular expressions in every day programming. But the grammar rules can be used for far more than regular expression matching.

To illustrate that, here is a grammar for arithmetic expressions:

``` sandbox
const arith = String.raw`
  expr   = factor ([+-] factor)*
  factor = term ([*/] term)*
  term   = \d+ / "(" expr ")"
`;

const expr = grammar_parser(arith);

var e = expr.parse("1+2*3");

write(e);
````

This is a sort of "Hello World" example for grammar parsers, but it goes beyond most programmer's normal use of regular expressions (it is not possible with a regular expression alone).

Grammar theory often focuses on the structure of the parse tree. In this case the objective is to parse: `1+2*3` as `1+(2*3)` rather than: `(1+2)*3`. 

``` box
       +                           *
      / \                         / \
    1    *      rather than      +   3
        / \                     / \
      2    3                   1   2
```

The parse tree generated by our grammar is correct, because multiplied `terms` will be associated before added `factors`. But the resulting data structure is far from an elegant text-book tree! It is matching: `1+2*3` more like this: `(1,+,(2,(*,3)))`.

However, our focus here is on simple pragmatic grammar rules to recognize the input text, without too much regard for the detailed structure of the resulting parse tree.

An application program can walk any grammar rule parse tree quite easily. However, we will often want to produce a simpler and neater parse tree data structure.

Rather than try to re-write the grammar rules to produce a different parse tree structure our approach here is to keep the grammar rules as a simple as possible. The focus is on recognition of the input text. The parse tree structure can be simplified separatley.

In fact the grammar parser machinery is well suited to processing the results of each grammar rule on the fly. This allows the parse tree to be simplified, or even for application processing to be applied. This can be implemented with so called grammar attributes, or semantic actions.

##  Semantic Actions

A grammar rule may be given an associated semantic action which is a function that is applied to the result of a successful rule match. The semantic action can examine the rule result and process it to derive a new result for the rule, or it can cause the rule to fail.

There are some common semantic actions that the grammar parser can provide as standard built-in functions. These standard function names extends the grammar rule language, in the same way that a programming language often provides common global built-in functions.

Custom semantic actions can be defined for a grammar, but these must be implemented in the host programming language, so unlike the grammar rules or the standard functions they are not portable across different implementations.

We will look at the using the standard built-in functions first. A prime reason for using semantic actions is to simplify the parse tree. Simple pattern recognition rules can be used to generate results that are then transformed into the desired parse tree structure.

Our little arithmetic expression grammar uses rules with this very common idiom:

``` eg
    rule = x (op x)*        e.g. 1+2+3 => (1,((+,2),(+,3)))
```
The rule result can be transformed into a neat text-book parse tree using these built-in functions:

* `yfx` -- returns a left associative tree.  e.g.  `1+2+3 => (1+2)+3`
* `xfy` -- returns a right associative tree.  e.g. `2^3^4 => 2^(3^4)`
* `xfx` -- returns a flat list excluding the operators. e.g. `1+2+3 => 1 2 3`
* `yfy` -- returns a flat list including the operators. e.g. `1+2+3 => 1+2+3`
* `string` -- converts the result into a string.
* `number` -- converts the result into a number.
* `x` -- is any result (without the default rule name label).
* `_` -- means ignore this result.

The `yfx` and `xfy` functions generate parse tree nodes in this form:

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

Now let's go back to our earlier CSV example, and see how we can use semantic actions to transform the parse tree into a simple array of arrays. That is the natural data structure to use in order to deliver a table of data to an application.

The idiomatic list structure generated by the `cells` rule can use the `xfx` function to transform the result into a flat list, ignoring the operators (which in this case are the comma separators):

``` sandbox
const rules = String.raw`
    table = nl* row+            : _x
    row   = &[^] cells nl*      : _x_
    cells = cell (',' cell)*    : xfx
    cell  = [^,\n\r]*           : x
    nl    = \n / \r\n?          : _
`;

const csv = grammar_parser(rules);

var input = `
a1,a2,a3
a2,b2,c2
`;

var arr = csv.parse(input)

write(arr)
```
Cells are allowed to be empty, and that means that an extra row with a single empty cell will match an empty line at the end of the CSV input. To eliminate that the row rule has a lookahead: `&[^]` which will check that there is some text to match.


##  Custom Semantic Action Functions

Semantic actions are a great way to simplify the parse tree for an appliciation program. If the built-in functions are not sufficient then custom functions can be defined for the grammar.

Custom functions can be pushed even further to embed the application processing into the parser. This enables the grammar-parser to be used as a string transform function that can return any desired data object.

A custom semantic function uses the host programming language. The semantic actions are organised as a set of named functions or methods, that are given to the `grammar_parser` function. The implementation can be resonably similar across languages, we will use JavaScript here.

Custom function names can be appended to the rule using the syntax: `: name`, just as we saw for the built-in functions. But this is optional, if the custom function are given the same name as the rule then they will be automatically applied.

To demonstrate, we can add semantic actions to our arithmetic expression grammar to make it into a calculator that can evaluate numeric results. The semantic actions are written as a set of named functions in an `evaluate` object, which is passed into the `grammar_parser` function along with the grammar rules:

``` sandbox
const arith = String.raw`
  expr   = factor ([+-] factor)*
  factor = term ([*/] term)*
  term   = \d+ / "(" expr ")"
`;

const evaluate = {
  expr:   ([f, fs]) =>
            fs.reduce((y, [op, x]) =>
              op === "+"? y+x : y-x, f),   
  factor: ([t, ts]) =>
            ts.reduce((y, [op, x]) =>
              op === "*"? y*x : y/x, t),
  term:   (x) => Number(x) || x[1]
}

const expr = grammar_parser(arith, evaluate);

var e = expr.parse("1+2*(3+4)-5");

write(e);
````
It is very convenient to employ the JavaScript arrow `=>` syntax for lambda functions, together with array pattern matching and a list `reduce` function. These features may not be familiar to all JavaScript programmers, but they will be familiar to functional programmers (there is nothing strange or pecuilar going on here). 

The power and simplicity of using grammar rules with regular expression components and semantic actions should be clear.


# Conclusion

Regular expressions are a well established feature used in many modern programming languages. Regular expression execution engines are extremely fast. Unfortunately the regular expressions syntax is very cryptic and hard to read. 

In practice regular expressions often need to be composed out of component parts. This is usually done with add-hoc program code. Instead of that, we are advocating the use of grammar rules to compose regular expression components in a neat standard format.

Grammar rules provide a great way to knit together regular expression components. They can be used to define almost any data format or domain specific language. Any unambiguous context free grammar.

The addition of semantic actions allows the parse tree to be be transformed into any data structure that best suits the application.

Semantic actions also provide an escape hatch to handle any odd irregular features in the grammar. With semantic actions the grammar is Turing complete, it can be used to recognize any language.

The hope is that the use of a grammar parser will become a standard tool for every day programming that can be used as easily as bare regular expressions. The use of grammar specifications should also enable much larger scale parsing to become routine.

Grammar rules make extemely neat and expressive specifications, and a grammar-parser makes it practical to embed grammar rules directly into program code.


``` replace
"   smart
'   smart
```



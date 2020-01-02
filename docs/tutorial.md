#   Grit Tutorial

In english we say: "Tom", or "Tom and Dick" or "Tom, Dick and Harry". We do not say: "Tom and Dick, Harry", or "Tom, Dick". The grammar rules can be defined something like this:

1. A name (e.g. "Tom").
2. Or, a name, followed by "and", then another name.
3. Or, a name, follwed by a comma name, followed by "and" and a last name.

Using the [`grit-parser`] we could try writing a grammar like this:

[`grit-parser`]: https://github.com/pcanz/grammar-parser/

``` sandbox
const tdh = grit`
    tdh  = name 
         / name "and" name 
         / name "," name "and" name
    name = \w+
`;

write(tdh.parse("Tom, Dick & Harry"));
```

Woops, that didn't work! Let's see what is happening here.

We have defined two grammar rules (`tdh` and `name`). The rules start on a new line with their name, and white-space in a rule is insignificant except for separating components. 

The `tdh` rule has three options separated by the `/` choice operator.

The `name` rule is defined with a regular expression (as usual `\w+` is one or more word character). 

The `grit` function is a JavaScript [template literal tag function] which reads the Grit grammar rules and generates a `tdh` parser object. The parser provides a `parse` function that will match input text according to the grammar rule specification.   

[template literal tag function]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals

This grammar fails because the first option (a name) matches, and the choice is satisfied, so the parse ends. The other options are not checked, the choice always settles for the first option that matches.

So we have to write it like this:

``` sandbox
const tdh = grit`
    tdh  = name "," name "and" name
         / name "and" name
         / name 
    name = \w+
`;

write(tdh.parse("Tom, Dick and Harry"));
```
That's what we wanted to see!

The `tdh` rule first matches its five components, the `name` components, and the literal `","` and `"and"` components.

The second option (after the `/` choice operator) will only be tried if the first option fails (and there is no back-tracking).

You can edit the example. If you delete the "Dick" and "Harry" you can see that the shorter options also work. After editing, hit the RUN button to parse the new input. If you hit the Example button the original will be restored.


##  Grit Rules

That works, but we can do better. Notice that the first name may need to be matched more than once, which is verbose and inefficient (although a clever compiler could arrange to cache the name). 

In Grit it is idiomatic to write it more succinctly as:

``` sandbox
const tdh = grit`
    tdh  = name (("," name)? "and" name)?
    name = \w+
`;

write(tdh.parse("Tom, Dick and Harry"));
```
Notice that the result is a nested list structure, we call it a parse tree.

The `?` suffix operator is the same as in a regular expression, it says that the "and" part is optional, as is the comma part.

But notice that because of the nested structure there is no way to match a comma name unless it is followed by an "and" name.

We can embellish this a little more by allowing "&" in place of "and" and by allowing a list of comma separated names:

``` sandbox
const tdh = grit`
    tdh  = name (("," name)* and name)?
    and  = "and" / "&"
    name = \w+
`;

write(tdh.parse("Tom, Dick, Sam and Harry"));
```
The expression `("," name)*` can match zero or more times, so it generates a list. 

The `*` repeat allows any number of matches, and if there are none then the result will be an empty list `[]`. Edit it to see.

The `+` repeat works the same way for one or more matches.

Both repeat operators will match as many times as possible (longest match), and they will not back-off to any shorter matches.

However, the "?" means optional, if it fails it returns `""` an empty match string (it matched nothing). This is not quite the same as a list of zero or one match. If you edit the input to just: "Tom", then you will see the result.

##  White-space

You may not have noticed but the rules do not mention white-space at all, so how did they match the white-space in the input?

The answer is the literal in double quotes (`","` and `"and"`). These literals will match any leading and trailing white space. This is a convenience feature, using a literal with single quotes will not match any extra white space.

We could match white-space explicitly, for eample if we want to insist that there must be no space before the comma, only after it:

``` sandbox
const tdh = grit`
    tdh   = name ((comma name)* and name)?
    and   = "and" / "&"
    comma = ',' \s*
    name  = \w+
`;

write(tdh.parse("Tom, Dick, Sam and Harry"));
```
Try adding a space before the comma and it will fail, but the previous examples will still match.

The `comma` rule now returns a list of two components (the comma and white-space). We can simplify that by putting the two components together into a single regular expression component:

``` sandbox
const tdh = grit`
    tdh   = name ((comma name)* and name)?
    and   = "and" / "&"
    comma = [,]\s*
    name  = \w+
`;

write(tdh.parse("Tom, Dick, Sam and Harry"));
```
The comma rule now only has one component, it is now a single regular expression that matches a comma followed by any number of white-space characters.

##  Regular Expression Components

In general a regular expression component can be complex. Any length without white-space (except inside square brackets). However a regular expression must start with a: `[`, `\`, or `^` character. 

A `^` prefix means the regular expression will match immediately, but in a grammar rule every component will do that anyway, without the need for an explicit `^` prefix.

A regular expression may contain parenthesis for capture groups as usual, so the `comma` rule can capture the comma alone, without the following white-space. But the regular expression can't start with an open parenthesis, so this is a case where a prefix `^` is required:

``` sandbox
const tdh = grit`
    tdh   = name ((comma name)* and name)?
    and   = "and" / "&"
    comma = ^([,])\s*
    name  = \w+
`;

write(tdh.parse("Tom, Dick, Sam and Harry"));
```
It is usually best to keep regular expressions short and simple. Capture groups are not usually needed since every separate component will appear as a match result.


##  Grammar Operators

In English there is an ["Oxford comma"], an extra comma at the end of a list, just before the final "and". We might try to add this option to our grammar like this:

["Oxford comma"]: https://www.grammarly.com/blog/what-is-the-oxford-comma-and-why-do-people-care-so-much-about-it/

``` sandbox
const tdh = grit`
    tdh   = name (list? and name)?
    list  = (comma name)+ comma?
    and   = "and" / "&"
    comma = ',' \s*
    name  = \w+
`;

write(tdh.parse("Tom, Dick, Sam and Harry"));
```
Good try, but this does not work! 

If you add an Oxford comma after "Sam" you will see why (hint: the "and" can be matched as a `name`).

The `+` operator will match as many comma names as possible, and it will not back off to match anything shorter. This is not the same as a `+` in a regular expression, in a regular expression the `+` repeat can back-off to a shorter match if necessary.

The Grit grammar rules use [PEG] (Parser Expression Grammar) logic, which is simpler than regular expression logic. 

[PEG]: https://en.wikipedia.org/wiki/Parsing_expression_grammar

Let's fix the Oxford comma. A simple patch to the `name` rule would work:

``` sandbox
const tdh = grit`
    tdh   = name (list? and name)?
    list  = (comma name)+ comma?
    and   = "and" / "&"
    comma = ',' \s*
    name  = !and \w+
`;

write(tdh.parse("Tom, Dick, Sam, and Harry"));
```
The `!` prefix operator will check that there is *not* a match. It will fail if there is a match, and a match will return an empty string without consuming any input.

The `!` oerator is used here in the `name` rule to exclude the "and" word from matching as a name.

A `&` prefix operator is also available, it will check there *is* a match. It fails if the match fails, or it suceeds and matches nothing.

This `name` rule works, but it's a kludge. The problem is that there is no clear way to diferentiate between a name and the "and" word. This is a commmon source of trouble in the very foundations of the syntax.

In this example the names are proper names that start with a captial letter. This allows us to separate the names from an "and" word (and any other prose):

``` sandbox
const tdh = grit`
    tdh   = name (list? and name)?
    list  = (comma name)+ comma?
    and   = "and" / "&"
    comma = ',' \s*
    name  = [A-Z][a-z]*
`;

write(tdh.parse("Tom, Dick, Sam, and Harry"));
```
The `name` rule defines proper names using a regular expression which will match a capital letter followed by any number or lower-case letters.

##  Action Functions

Now that our grammar is doing what we want it is time to clean up the messy parse tree structure that the parser generates.

This is a job for semantic action functions:

``` sandbox
const tdh = grit`
    tdh   = name (list? and name)?
    list  = (comma name)+ comma?
    and   = "and" / "&"
    comma = ',' \s*
    name  = [A-Z][a-z]*
`;
tdh.actions = {
    tdh: ([name, more]) => {
        if (more === "") return name;
        var [list, and, last] = more;
        return [name, ...list, last];
    },
    list: ([xs, _]) => 
        xs.map(([_,name]) => name)
}

write(tdh.parse("Tom, Dick, Sam, and Harry"));
```
The `tdh` and `list` action functions remove the syntax "noise" to transform the result into a clean AST (Abstract Syntax Tree).

The grammar rules specify a parser that will match the input without any action functions. You can delete all the action functions in the last example to see this (it's the same as the previous example).

##  Lexer

Now for a digression to compare our Grit grammar with a more traditonal parser design.

The traditional way to build a parser is to first transform the input text into a list of *tokens* eliminating the white-space and comments. This is called a *lexer*.

The parser then takes a list of tokens as input and applies the grammar rules to generate an AST.

Here is a little lexer for our example:

``` sandbox
const lex = grit`
    tokens = (token ws)*
    token  = name / syntax
    name   = [A-Z][a-z]*
    syntax = ',' / and
    and    = 'and' / '&'
    ws     = \s*
`;
lex.actions = {
    tokens: (ts) => ts.map(([t,_])=>t),
    and: () => '&'
};

var input = "Tom, Dick, Sam, and Harry";
write(lex.parse(input));
```
The result is a nice clean list of tokens, that's what a lexer does.

A traditional parser takes a list of tokens as input and the grammar is defined in terms of tokens. But the Grit grammar works on text strings, and it integrates the lexer function into the grammar rules. In practice this is a much neater approach.

But let's forge ahead with the traditional separate lexer and parser to see what that looks like:

``` sandbox
const tdh = grit`
    tdh   = name (list last)?
    list  = (comma name)*
    last  = comma? '&' name
    name  = \w+
    comma = ','
`;
tdh.actions = {
    tdh: ([name,[list, last]]) => last?
        [name, ...list, last] : name,
    list: (xs) => xs.map(([_,n]) => n),
    last: ([_, and, name]) => name
}

const lex = grit`
    tokens = (token ws)*
    token  = name / syntax
    name   = [A-Z][a-z]*
    syntax = ',' / and
    and    = 'and' / '&'
    ws     = \s*
`;
lex.actions = {
    tokens: (ts) => ts.map(([t,_])=>t),
    and: () => '&'
};

var input = "Tom, Dick, Sam, and Harry";

var tokens = lex.parse(input);
var parse = tdh.parse(tokens.join(''));

write(parse);
```
Integrating the lexer and parser back together again:

``` sandbox
const tdh = grit`
    tdh   = name (list last)?
    list  = ("," name)*
    last  = ","? and name
    name  = [A-Z][a-z]*
    and   = "and" / "&"
`;
tdh.actions = {
    tdh: ([name,[list, last]]) => last?
        [name, ...list, last] : name,
    list: (xs) => xs.map(([_,n]) => n),
    last: ([_, and, name]) => name,
    and: () => '&'
}

var input = "Tom, Dick, Sam, and Harry";

var parse = tdh.parse(input);

write(parse);
```
A lexer is not needed, but it helps to think about the semantic tokens, and to separate them out from the tokens for syntax and white-space.

The end result is very similar to our previous version.


##  Summary

We have used a very simple example and beaten it to death to illustrate most of the Grit grammar features:

* We have touched on all the grammar operators: `/ * + ? ! &`
* Seen how regular expression components can be used.
* Used action functions to generate a clean AST.

If you have managed to read through all the examples then well done! You should be able to start writing your own grammars now. If you are unsure then try editing the examples here to play around a bit more. 

For further reading see the [Grit grammar] documents.

[Grit grammar]: https://pcanz.github.io/grammar-parser/



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

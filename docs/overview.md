#	 Grit Parser Overview

The Grit parser enables grammar rules to be used in everyday programming. Grit grammar rules can be used instead of regular expressions, they are simply better.

* Grammar rules combine regular expressions in small components that are much easier to understand.

* Grammar rules can express nested syntax that is just not possible with a regular expression alone.

The following examples are in JavaScript to demonstrate excutable program code, but the grammar rules themselves are independent of the host programming language. The [`grit-parser`] is used to run the examples.

[`grit-parser`]: https://github.com/pcanz/grammar-parser/


##  A First Example

The first example simply matches a date format such as: "2013-04-05". The `date` grammar is a regular expression composed of named rules for its component parts:

``` sandbox
const date = grit`
    date  = year '-' month '-' day
    year  = \d{4}
    month = \d\d
    day   = \d\d
`;

var date_match = date.parse("2013-04-05")

write(date_match)  // ===>
---
// using a single grammar rule...

const ymd = grit`
    date  = \d{4} '-' \d\d '-' \d\d
`;

var date_match = ymd.parse("2013-04-05")

write(date_match)
---
// using a standard regular expression...

const date = /^(\d{4})-(\d\d)-(\d\d)$/;

var date_match = date.exec("2013-04-05")

write(date_match)
```
 
The `date` grammar rule matches a sequence of five components. Three named components (year, month, day) separated by two literal "-" dash components. The white space in the rule separates the component parts, but is otherwise insignificant.

The `year`, `month` and `day` rules are defined using standard regular expressions. As usual, the `\d` represents a digit character `[0-9]`, and `\d{4}` matches four digits.

The `grit` function is a JavaScript [template literal tag function] which reads the Grit grammar rules as a DSL (Domain Specific Language). The result of the `grit` function is a `date` parser object. The parser provides a `parse` function that will match input text according to the grammar rule specification.   

[template literal tag function]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals

This example could be written as a single grammar rule, or as a standard regular expression (as shown in examples 1.2 and 1.3). Grammar rules allow a regular expression to be separated out into smaller component parts that can be named with their semantic meaning. This makes the grammar much easier to read and understand, particularly in larger examples.

The key point is that the `grit` function enables a programmer to write grammar rules that can be directly used to match input text strings. The grammar rules *are* the parser.


##  Grammar Rules

The Grit grammar is a form of [PEG] (Parser Expression Grammar), which has a `/` choice operator. The choice operator is demonstrated in this next version of the date format example:

[PEG]: https://en.wikipedia.org/wiki/Parsing_expression_grammar

``` sandbox
const date = grit`
    date  = year '-' month '-' day
    day   = [0][1-9] / [1-2]\d / [3][0-1]
    month = [0][1-9] / [1][0-2]
    year  = \d{4}
`;

var date_match = date.parse("2013-04-05")

write(date_match)  // ===>
```

In this grammar the `/` choice operator is used to refine the `month` rule to match only 1..12, and the `day` rule to match only 1..31. The examples are interactive, you can edit the test date to see that the parser works as expected.

The choice operator tries to match each option in turn from left to right, and returns the result of the first option that matches, or the rule fails.

Once a match has been found there is no back-tracking to try any further options. This makes the PEG `/` choice operator simpler than the `|` choice operator that is used in regular expressions or traditional context-free grammar rules.

A PEG grammar is always unambiguous, which is exactly what we want for data formats and computer languages. In this example the whole grammar is a regular expression, but a PEG grammar has the power to express any context-free language (and more).


##  Parse Trees

Many applications for a grammar could be implemented as a (maybe complex) regular expression. But applications that involve nested syntax usually require a context-free grammar (which is beyond the power of a regular expression alone).

To illustrate, here is a context-free grammar for arithmetic expressions:

``` sandbox
const arith = grit`
  expr   = factor ([+-] factor)*
  factor = term ([*/] term)*
  term   = \d+ / "(" expr ")"
`;

var e = arith.parse("1+2*3");

write(e);
````
This is a sort of "Hello World" example for a context-free grammar.

In plain english:

* An expression is a factor, which may be followed by any number of additive factors.
* A factor is a term, which may be followed by any number of multiplicative terms.
* A term is either a number or an expression in brackets.

Traditional grammar theory often focuses on the structure of the parse tree that the grammar rules define. In this case the objective is to parse: `1+2*3` as `1+(2*3)` rather than: `(1+2)*3`. 

``` box
       +                           *
      / \                         / \
    1    *      rather than      +   3
        / \                     / \
      2    3                   1   2
```
In theory, grammar rules generate an AST (Abstract Syntax Tree). However, PEG rules are recognition rules that match the syntax of the input text. The resulting parse tree is a nested array of string values (by default) that is not necessarily an ideal AST.  

The parse tree generated by our `expr` grammar is not ideal, but it does have the correct nested structure. Multiplied `terms` will be associated before added `factors`. The example parse tree structure is: `(1,(+,(2,(*,3))))`.

For a large grammar it may be worth transforming the parse tree into a formal AST structure, but in practice most applications can process an idiomatic parse tree just as easily as a more formal AST structure.

##  Semantic Actions

Grit grammar rules can have an associated semantic action, which is simply a function that is applied to the result of a successful rule match.

Semantic action functions can be used to generate a formal AST, or they may be used by the application to directly process the rule results on-the-fly.

To demonstrate, we can add semantic actions to our arithmetic expression grammar to make it into a calculator that can evaluate numeric results. The semantic actions are written as a set of named functions which the parser can use with the grammar rules:

``` sandbox
const arith = grit`
  expr   = factor ([+-] factor)*
  factor = term ([*/] term)*
  term   = \d+ / "(" expr ")"
`;

arith.actions = {
  expr:   ([f, fs]) => fs.reduce((y, [op, x]) =>
                    op === "+"? y+x : y-x, f),   
  factor: ([t, ts]) => ts.reduce((y, [op, x]) =>
                    op === "*"? y*x : y/x, t),
  term:   (x) => Number(x) || x[1]
}

var e = arith.parse("1+2*(3+4*5)-5");

write(e);
````
In this case there is a semantic action for each rule, using the same name as the rule. In general any action name can be appended to the rule expression after a `:` colon operator, and not all rules may need an action.

In this example it is very convenient to employ the JavaScript functional programming style, with the arrow `=>` syntax for lambda functions, together with array pattern matching and a list `reduce` function.

The power and simplicity of using grammar rules with regular expression components plus semantic action functions should now be clear.


# Conclusion

Regular expressions are a well established feature used in many modern programming languages. Regular expression execution engines are extremely fast. Unfortunately the regular expressions syntax is very cryptic and hard to read. 

In practice regular expressions often need to be composed out of component parts. This is usually done with ad-hoc program code. Instead of that, we are advocating the use of grammar rules to compose regular expression components in a neat standard format.

Grammar rules provide a great way to knit together regular expression components. They can be used to define almost any data format or domain specific language with an unambiguous context free grammar.

The addition of semantic actions allows the parse tree to be be transformed into any data structure that best suits the application.

Semantic actions also provide an escape hatch to handle any odd irregular features in the grammar. With semantic actions the grammar is Turing complete, it can be used to recognize any language.

The hope is that the use of a grammar parser will become a standard tool for every day programming that can be used as easily as bare regular expressions. The use of grammar specifications should also enable much larger scale parsing to become routine.

Grammar rules make extemely neat and expressive specifications, and a grammar-parser makes it practical to embed grammar rules directly into program code.


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

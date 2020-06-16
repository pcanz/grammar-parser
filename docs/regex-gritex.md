#   From Regex to Gritex

A regular expression, or *regex*, is a common feature of modern programming languages. A regex is often used for pattern matching in every-day text processing.

In contrast, grammar rules live in a separate world, they are used for specifications, but only a few programmers use grammar based parsers. They are generally reserved for special projects, such as implementing a parser for a full programming language.

Grammar rules are more powerful than regular expressions, they can be used to define context-free languages. Most programming languages, domain specific languages, and data formats used in practice can be recognized by a context-free parser.

The term *gritex* is introduced here to mean a more general form of *regex* that can be defined by grammar rules.  As you will see a gritex can be defined just as easily as a regex, and used for pattern matching in every-day programming.

The following examples are in JavaScript to demonstrate executable program code, but the grammar rules themselves are independent of the host programming language. The [`grit-parser`] is used to run the examples.

[`grit-parser`]: https://github.com/pcanz/grammar-parser/

To see how this works, let's start with a simple regular expression:

gritbox
    const regex = /^(\d{4})-(\d{2})-(\d{2})/;

    write( regex.exec("2020-03-04") );

The regular expression defines a *regex*, but a *gritex* object can be created from exactly the same regular expression.

The gritex object is created using a `grit` template literal tag function, and offers a `parse` method rather than the regex `exec`:

gritbox
    const gritex = grit`^(\d{4})-(\d{2})-(\d{2})`;

    write( gritex.parse("2020-03-04") );

The match result is slightly different, but the gritex is a direct alternative to the regex.

In a grammar rule a regular expression can be pulled apart into separate components:

gritbox
    const gritex = grit`\d{4} '-' \d{2} '-' \d{2}`;

    write( gritex.parse("2020-03-04") );

This *gritex* is defined with a grammar rule that contains five separate components. It matches in the same way as the original *regex* except that each of its component parts are matched separately.

The regex capture-group parentheses are not required since each component match returns its own match result. The leading `^` can be dropped since a gritex always matches the full input from the beginning.

White-space in the grammar rule is not significant, other than to separate the component parts. But it does mean that a regex component in a grammar rule can not contain a space character, unless it is inside square brackets (as a character in a regex character set).

In a grammar rule a regex component must start with a square bracket character set, or a backslash regex shorthand character set, or a leading `^`. To match a literal string component it must be in quotes (or be given a `^` prefix).

This grammar rule can be reduced back to a single regular expression, but without capture groups it will be matched as a single component:

gritbox
    const date = grit`\d{4}-\d{2}-\d{2}`;

    write( date.parse("2020-03-04") );

You can edit any of the examples and hit the Run button to try things out, hitting the Example button will restore the original source text. You might try putting back one or more capture groups, or separating out components, to see what happens.

A grammar typically has more than one rule, and each rule starts with a name. The first rule name is optional, but it is a good practice to name all the rules, even if there is only one:

gritbox
    const date = grit`
        ymd = \d{4} '-' \d{2} '-' \d{2}
    `;

    write( date.parse("2020-03-04") );

Grammar rule components can name other grammar rules, and this allows the same example to be expressed with named components:

gritbox
    const date = grit`
        date  = year '-' month '-' day
        year  = \d{4}
        month = \d{2}
        day   = \d{2}
    `;

    write( date.parse("2020-03-04") );
 
This grammar defines a gritex that is the just the same as the regex that we started with, but expressed in a different way. This version is easy to read, but more verbose. You may prefer a more succinct regex style grammar rule, it's your choice.

Large regular expressions are often hard to read and understand, for example:

gritbox
    const uri = /^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/;

    var text = "https://host/path/file/foo.txt";

    write( uri.exec(text) );

    
In this case a grammar rule version is far easier to read and understand:

gritbox
    const uri = grit`
        uri    = scheme? host? path query? frag?
        scheme = [^:/?#]+ ':'
        host   = '//' [^/?#]*
        path   = [^?#]*
        query  = '?' [^#]*
        frag   = '#' [^\s]*
    `;

    var text = "https://host/path/file/foo.txt";

    write( uri.parse(text) );

The grammar rule version has simply split the regex apart into named components. The Grit grammar rule parser can efficiently knit together small regular expression components.

The grammar rule gritex is doing nothing more than the regex, but the ability to split the regex into smaller named components is a big win.

##  Full Text Match

The big difference between a regex and a gritex is that a regex is ideal for finding the first match in surrounding text, whereas a gritex insists on matching the full input text.

For example, to find a date match with a regex:

gritbox
    const date_regex = /(\d{4})-(\d{2})-(\d{2})/;

    const input = "The start is: 2020-03-04."

    write( date_regex.exec(input) );

The regex engine will implicitly try at each character position form the beginning until it finds a match.

In a gritex this has to be made explicit:

gritbox
    const date = grit`
        ymd  = ^.*?(\d{4})-(\d{2})-(\d{2}).*
    `;

    const input = "The start is: 2020-03-04."

    write( date.parse(input) );

This works because a grammar rule can use any regular expression, but it is not ideal, a regex is a better fit for this task.

A grammar must match the full input text, so a grammar to match dates anywhere in the input needs to skip all text other than the date matches.

gritbox
    const date = grit`
        find = date*
        date = \D* ymd? \d*
        ymd  = \d{4} '-' \d{2} '-' \d{2}
    `;
    date.actions = {
        date: ([_,ymd,__]) => ymd,
        ymd:  ([y,_,m,__,d]) => [y,m,d]
    }

    const input = `
        It starts: 2020-03-04,
        and ends: 2020-05-06.
    `;

    write( date.parse(input) );

The semantic action functions provide a convenient way to simplify the results so that only the date matches are returned.

Using a regex is an easier way to find a single match. But a gritex can find multiple matches, and that is a more difficult task for a regex.


##   Repeating Matches

A regular expression match only returns the last match of a capture-group, so a repeated regex can not be used to return individual matches for multiple items. 

For example, this regex will match words in a list, but repeated matches will only report the last word matched:

gritbox
    const list = /(\s*(\w+))*/;

    write( list.exec("abc def ghi") );

Using a string `match` with a regex plus a global flag will return all matches, but not any capture groups. JavaScript ES 2020 has introduced a `matchAll` to help, but in general program code is needed to iterate a regex match.

A grammar rule version defines a gritex that does not have this problem, all the list items are individually matched:

gritbox
    const list = grit`(\s*(\w+))*`;

    write( list.parse("abc def ghi") );

Or spelling the same thing out a bit more:

gritbox
    const list = grit`
        list = item*
        item = \s* \w+
    `;

    write( list.parse("abc def ghi") );

Traditional grammar based parsers use a pre-processor, sometimes called a lexer, that can use regular expressions to break the input text into a list of tokens. But a Grit grammar can integrate the lexer token matching into the grammar rules.

Here is a simple lexer that will match words or symbols and skip white-space:

gritbox
    const lexer = grit`
        lex     = token*
        token   = int / var / symbol
        int     = \s*(\d+)
        var     = \s*(\w+)
        symbol  = \s*([^ \w]+)
    `;

    write( lexer.parse("x = a+2*b") );

Notice that the digits in an `int` can also be matched by the regex word `\w` shorthand, so the `int` must be matched first, before the `var`. The `/` choice operator only returns the *first* match (there is no ambiguity, choice rules do not backtrack).

This grammar defines a gritex that can be run as a parser. It uses named regex expressions, knitted together in sequence, or as alternatives with the `/` choice operator. The grammar rules follow the formal logic of a [PEG] (Parser Expression Grammar).

[PEG]: https://en.wikipedia.org/wiki/Parsing_expression_grammar

The tokens here are simply the matched strings, but a real lexer would probably generate objects with a type, a value, and other information. A Grit grammar could use semantic action functions to generate token objects, but our focus here is on using a gritex as an alternative to a regex.

##  Grammar Specifications

Grammars are not often used in program code, but they are often used in specifications to define what the program code should do.

For example, here is a fragment of the [JSON specification] that defines numbers:

    number
        integer fraction exponent
    integer
        digit
        onenine digits
        '-' digit
        '-' onenine digit
    digits
        digit
        digit digits
    digit
        '0'
        onenine
    onenine
        '1' . '9'
    fraction
        ""
        '.' digits
    exponent
        ""
        'E' sign digits
        'e' sign digits
    sign
        ""
        '+'
        '-'

[JSON specification]:  https://www.json.org/json-en.html

Translating this directly into a Grit grammar we get:

    number   = integer fraction? exponent?
    integer  = '-'? ('0' / [1-9][0-9]*)
    fraction = '.' [0-9]+
    exponent = [eE][+-]?[0-9]+

Translated into a regex:

    num_regex = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/

The formal grammar specification is clear and easy to understand with minimal syntax, but rather verbose. The Grit grammar requires more syntax, but it is almost as easy to read and understand, and it is nice and concise. The regex is simply too cryptic, although many programmers would find it easy enough to read and understand.

The Grit grammar rules are a compromise between the clarity of a formal specification, and the automated efficiency of a regular expression.  There is an art to the design of good grammar rules that are both easy to understand, and easy to execute as an efficient parser.


##  Context-free Grammars

Nested expressions are beyond the power of a regular expression, a context-free grammar is required.

For example, here is a very basic grammar for balanced parentheses:

gritbox
    const paren = grit`
        p = '(' (p/q)* ')'
        q = [^()]*
    `;

    const text = `(x((y)z))`;

    write(paren.parse(text));

The regular expression `q` matches any characters other than parentheses, and `p` matches any number of `p` or `q` terms inside a pair of parentheses.

This is more than a regular expression because a `p` rule can be nested inside an outer `p` by calling itself recursively. 

Here is a more realistic grammar for nested expressions:

gritbox
    const expr = grit`
        expr   = term*
        term   = token / "(" expr ")"
        token  = int / var / symbol
        int    = \s*(\d+)
        var    = \s*(\w+)
        symbol = \s*([^ ()\w]+)
    `;

    write( expr.parse("x = (a+(2*b))+c") );

The grammar is easy enough to read, it says that an `expr` is any number of terms, `term*`, and a `term` is either a `token` or a nested `expr` inside parentheses.

The only grammar rule components that match any input are quoted literal strings or named regular expressions, the trick is that the rule names allow recursion, which enables matching of nested expressions.


#   Conclusion

Starting with a regular expression we have seen how a grammar rule is just another way to do the same thing. A grammar with a single rule can be used to match input text is exactly the same way as a regex.

This enables grammar rules to define a *gritex* that can be used in every-day programming just as easily as a *regex*.

Grammar rules allow a regular expressions to be broken out into smaller components, in separate named rules, which makes larger regular expressions much easier to read.

Grammar rules are a better alternative simply because they can express a regex in a better way. Large regular expressions are far too cryptic.

Grammar rules also enable a regex to be used to match a sequence of terms, without any extra program code. To use a regex to generate a list of match results usually requires program code to iterate the regex through the input.

Finally we allowed the grammar rules to call each other recursively, and this moves beyond regular expression matching into the world of context-free grammar matching. Almost all practical programming languages and data structures can be parsed with a context-free grammar.

We have not discussed it here, but a Grit grammar can also use semantic action functions to process rule results, and this provides an escape hatch to even go beyond context-free grammars. The full programming language power is available. This is useful (and occasionally essential) to cope with an odd language feature that can not be expressed with context-free grammar rules.

Grammar rules can define a *gritex* that is just as easy to use as a *regex*, but far more powerful.

scribe
    gritbox  ./lib/gritbox.js


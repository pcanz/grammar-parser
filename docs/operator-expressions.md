#   Operator Expression Parsing

An operator expression can be any kind of symbolic expression with operators and operands. Arithmetic expressions make good examples, but in other applications the operators and operands can be used to represent almost anything. 

The objective is to parse an operator expressions into a parse tree data structure, also known as an AST (Abstract Syntax Tree).

##  Baisc Concepts

Parsing an operator expression boils down to adding parentheses correctly around associated operators and operands. An initial expression need not have any parentheses, but after it is parsed it will have a full set of parentheses.

It might seem logical to simply add parentheses from left to right:

        1+2*3   ==>   ((1+2)*3)   ==>  9

But by convention multiplication has a higher *precedence* than addition:

        1+2*3   ==>   (1+(2*3))  ==>  7

Operators with the same precedence usually *associate* from left to right:

        10-4-3-2  ==>  (((10-4)-3)-2)  ==>  1       Not:  (10-(4-(3-2)))  ==> 7

But there are exceptions, exponents associate from right to left:

        2**3**4   ==>  (2**(3**4))  ==>  2**81      Not: ((2**3)**4)  ==> 2**12      

To parse an operator expression the parser needs to know the operators *precedence* and *associativity*.


##  Operator Notation

We will borrow the notation for operator precedence and associativity used in [Prolog].

[Prolog]: https://www.swi-prolog.org/pldoc/man?section=operators

The notation `yfx` represents an infix operator that associates to the left, and `xfy` for an infix operator that associates to the right. An `xfx` operator does not associate to the left or the right (only one of these operators is expected in an un-bracketed expression).

The notation reads like a picture, the `f` is the operator and the `x` or `y` are the expression on the left or right of the operator. The `y` indicates that the operator can associate in this position. In other words, several operators with equal or higher precedence may appear in the expression in the `y` position, but only operators with strictly higher precedence can appear in the `x` position.

An `fy` or `fx` are prefix operators, and `xf` or `yf` are suffix operators. There are seven possible operator signatures:

    fx  fy   xfx xfy yfx   yf  xf

For example, basic arithmetic operators can be defined like this, in order of precedence, high to low:

    xfy   **     highest precedence, associates to the right.
    yfx   *      associates to the left.
    yfx   + 
    xfx   =      lowest precedence, will not associate left or right.
    
Given these definitions this expression will parse like this:

    x = a+(b*c)**2   ==>   (x=(a+((b*c)**2)))

With these definitions the "`=`" operator does not associate to the left or the right, so there can not be two "`=`" operators in an expression. In programming languages where "`=`" is an assignment operator it may be defined as `xfy` to allow it to associate to the right.

There may be several operators with the same signature and precedence, and the same operator symbol may be defined with more than one signature. In arithmetic a "`+`" operator may be defined as a `fy` prefix operator as well as a `yfx` infix operator.

Here is a larger example with operators in five precedence levels:

    fy    +  -
    xfy   ** 
    yfx   *  /  //  div  rdiv  <<  >>  mod  rem
    yfx   +  -  /\  \/  xor 
    xfx   <  =  =<  ==  =\=  >  >=  \=  \==  as  is  

The prefix operators at the top have high precedence and bind their operands tightly, the comparison operators at the bottom have low precedence and bind loosely over larger operand expressions.

For example:

    a+b*c >= d**2  ==>  ((a+(b*c))>=(d**2))

The compare operators have an `xfx` signature, so they can not associate. An expression such as: `x > y > z` makes no sense (except in Python and Julia where it it is interpreted to mean: `x > y and y > z`).


##  Grammar Rules

Here is a bare minimum grammar to match input operator expressions:

grit
    const expr = grit`
        expr   = term (op term)*
        op     = "+" / "-" / "*" / "/"
        term   = \w+
    `;

    write(expr.parse("1+2*3"));

scribe
    grit    /Users/pcanz/Sync/scribe/lib/gritbox.js

This grammar takes no account of precedence or association, it simply matches a sequence of terms and operators. 

To take account of precedence the operators can be split into separate grammar rules, one for each precedence level:

grit
    const expr = grit`
        add    = mult (op2 mult)*
        mult   = term (op1 term)*
        op1    = "*" / "/"
        op2    = "+" / "-"
        term   = \w+
    `;

    write(expr.parse("1+2*3"));

The `mult` rule will match the `*` or `/` operator with its operands before the `add` rule matches the `+` or `-` operators with their operands. In other words the the `op1` operators have higher precedence and bind tighter than the `op2` operators.

There is no left (or right) association between operators of the same precedence, the grammar matches the input into a flat list of operators and operands. The parse tree resulting from this grammar directly reflects the input format (pattern matching).

For a `yfx` left associative operator we want the parse tree to group the terms so that they are nested on the left. The traditional approach is to to use left recursion in the grammar rules, instead of this we are going to use a semantic action function. This allows us to keep the grammar rules as simple input pattern matching recognizer rules.

An action functions can be used to process the rule results into a nice AST with a left associative nested tree structure.

grit
    const expr = grit`
        add    = mult (op2 mult)*  : yfx
        mult   = term (op1 term)*  : yfx
        op1    = "*" / "/"
        op2    = "+" / "-"
        term   = \w+
    `;

    expr.actions = {
        yfx: ([x,xs]) => xs.reduce(
                (t,[op,y]) => [op,t,y], x),
    }

    write(expr.parse("1+2*3"));

The action function has been called `yfx` for obvious reasons, and it can be implemented with a standard list reduce function. It produces an AST with nodes in operator prefix format:

                              +
                             / \
        (+,1,(*,2,3)) <==>  1   *
                               / \
                              2   3

Adding more operators into this two level precedence grammar is simple:

grit
    const expr = grit`
        expr   = fact (op2 fact)*  : yfx
        fact   = term (op1 term)*  : yfx
        op1    = "*" / "/" /"<<"/">>"/"mod"/"rem"
        op2    = "+" / "-" /"and"/"or"/"xor"
        term   = \w+
    `;

    expr.actions = {
        yfx: ([x,xs]) => xs.reduce(
                (t,[op,y]) => [op,t,y], x)
    }

    write(expr.parse("1+2*3 mod 4+5"));

Adding extra precedence levels or new operator signatures requires extra rules. The pattern of grammar rules corresponding to operator precedence levels should be apparent:

grit
    const expr = grit`
        expr   = exp3 (op4 exp3)*  : xfy
        exp3   = exp2 (op3 exp2)*  : yfx
        exp2   = exp1 (op2 exp1)*  : yfx
        exp1   = term (op1 term)*  : xfy
        op1    = "^"
        op2    = "*" / "/" /"<<"/">>"/"mod"/"rem"
        op3    = "+" / "-" /"and"/"or"/"xor"
        op4    = "=" / "\=" / "<"/"<="/">"/">="
        term   = atom / group
        group  = "(" expr ")"
        atom   = \s*(\w+)
    `;
    expr.actions = {
        yfx: ([x, ys]) => ys.reduce(
            (y, [op, z]) => [op,y,z], x),

        xfy: function xfy([x, ys]) {
            if (!ys || ys.length < 1) return x;
            let [[op,y], ...zs] = ys;
            return [op, x, xfy([y,zs])];
        },
        group: ([_,expr]) =>  expr
    }

    write(expr.parse("x = (y mod z)^2 + 4"));

These four precedence levels could have been given names, such as: `exponential`, `multiplicative`, `additive`, and `comparative`. But it is only the order of precedence between operators that really matters.

The `xfy` right associate operators require a slightly more complicated action function.



grit
    const expr = grit`
        expr   = exp3 (op4 exp3)*      : xfy
        exp3   = exp2 (op3 exp2)*      : yfx
        exp2   = exp1 (op2 exp1)*      : yfx
        exp1   = exp0 (op1 exp0)*      : xfy
        exp0   = op0 exp0 / term
        op0    = '+' / '-' / '!' / '~'
        op1    = "^"
        op2    = "*" / "/" /"<<"/">>"/"mod"/"rem"
        op3    = "+" / "-" /"and"/"or"/"xor"
        op4    = "=" / "\=" / "<"/"<="/">"/">="
        term   = atom / group
        group  = "(" expr ")"
        atom   = \s*(\w+)
    `;
    expr.actions = {
        yfx: ([x, ys]) => ys.reduce(
            (y, [op, z]) => [op,y,z], x),

        xfy: function xfy([x, ys]) {
            if (!ys || ys.length < 1) return x;
            let [[op,y], ...zs] = ys;
            return [op, x, xfy([y,zs])];
        },
        group: ([_,expr]) =>  expr
    }

    write(expr.parse("x = (y mod z)^2 + 4"));



It is not necessary to have a large number of precedence levels, most users will only be able to remember a small number. It is considered good practice to use explicit parentheses to make the precedence clear.

Operator precedence levels provide a convenient short-hand to avoid parentheses, but they are not essential. APL, Smalltalk, and Lisp, are examples of programming languages that do without any operator precedence levels.

However, general purpose programming languages can define quite a large number of different precedence levels (C defined 15, JavaScript has more than 20). In that case having a grammar rule for each precedence level becomes unwieldy, and a special purpose parser may be a better option.


##  Operator Expression Parser

Grit provides a special purpose parser for operator expressions. This is an `operators` function that takes a list of operator definitions and returns an action function that can transform the tokens of an operator expression into a prefix format parse tree.

This allows the previous example to be written like this:

grit
    const expr = grit`
        expr   = term*
        term   = atom / group
        group  = "(" expr ")"
        atom   = \s*(\w+|[=*/\\~^<>:.?@#$&+-]+)
    `;
    expr.actions = {
        expr: grit.operators(
            ["fy", "+", "-", "!", "~"],
            ["xfy", "^"],
            ["yfx", "*","/","<<",">>","mod","rem"],
            ["yfx", "+","-","and","or","xor"],
            ["xfx", "=" ,"\=","<","<=",">",">="] 
        ),
        group: ([_,expr]) => ["()", expr, null]
    };

    write(expr.parse("x = (y mod 12)^2 + 4"));

The `expr` grammar rule parses an input operator expression into a flat list of `term` tokens. The action function for the `expr` rule transforms the token list into a parse tree with an operator prefix format. The action function is generated by the `grit.operators` function, given a list of operator definitions.

Notice that the operator expression parser is entirely controlled by the list of operator definitions. The operators are ordered from highest to lowest precedence. This action function takes a list of operator and operand tokens and incrementally builds a parse tree, using a technique inspired by the [Pratt] parser algorithm.

[Pratt]: https://en.wikipedia.org/wiki/Pratt_parser

In this example the grammar rules themselves are only being used as a "lexer" to generate a token (`term`) list. A more realistic example is likely to have more grammar rules for the tokens (e.g. to skip comments, and to parse literal objects).  There could also be higher level grammar rules for language features that contain operator expressions as component parts.

The parse tree nodes are arrays with the format: `[op, left, right]` (the `left` and `right` values can be sub-trees or operand values). To build the tree incrementally the parser must be able to distinguish a tree node from a leaf element operand value.  The operand values are usually a string or number, but they may be any data type. If an operand value is an array type then it could be confused with a tree node. To avoid any confusion the operand value can be wrapped into a node with a `nop` operator (a do nothing identity function).

Explicit parentheses in the source expression will be parsed as nested expression sub-trees, but these sub-trees must be seen as leaf elements (operands) in the larger AST. For this reason the `group` action function adds an extra array wrapper around the sub-tree to ensure that it will be seen as an leaf node (the `()` operator symbol acts as a `nop`).

The `grit.operators` parser makes it easy to handle a large number of operators with a large number of precedence levels. It also enables new operators to be easily defined. A programming language may even allow operators to be dynamically defined, as is done in Prolog.


##  Conclusion

Operator expressions can be used for a wide variety of applications, as special purpose notations, or the basis of a DSL (Domain Specific Language).

The Grit parser offers two ways to implement operator expression parsing. A direct grammar rule implementation works well for a small number of operator precedence levels. But for a large number of precedence levels a special purpose `grit.operator` function can be used (to generate a grammar rule action function).

A parser for any operator expression can be fully defined by a list of operator specifications, ordered by precedence. 

A significant part of the syntax of many programming language can be defined in terms of operator expressions. In some cases almost the complete language can be defined as an operator expression. The Prolog language is a good example.


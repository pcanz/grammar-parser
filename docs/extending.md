#   Extending The Grammar

Most computer languages and data formats can be parsed with Grit grammar rules, but there are a few exceptions that may require the grammar to be extended.  A grammar rule extension can be implemented with an action function.

Action functions allow the full power of the host programming language to be used to extend the grammar rules. This is an escape-hatch that needs to used carefully, but sometimes it is the only way to get the job done.


##  Matching The Same Again

Consider for example a quoted string format that allows *any* number of quote marks at the start matched by the *same* number at the end. This format has the advantage that it can quote text that contains any number of quote marks. If there is a sequence of N quote marks in the content, then the outer quotes can use N+1 quote marks.

If only a small number of different quote marks are needed then we could write a grammar with a separate rule to match a single quote mark, two quote marks, three, four, and so on. This obviously becomes impractical for more than a small number of rules.

If the regular expression package supports `\1` to mean match the same text as the first capture group, then this regular expression will do the trick:

gritbox
    const raw = grit`
        raw = ^('+)(.*?)\1
    `;
    raw.actions = {
        raw: ([_,x]) => x
    }

    const test = `'''xx ''y'' zz'''`;

    write(raw.parse(test));

Not all regular expression packages have been extended to include this feature. Technically it is is not a regular expression anymore, and there are good reasons why it may be best to avoid this regex feature [Cox].

[Cox]: https://swtch.com/~rsc/regexp/regexp1.html

Grammar rules with action functions can be used to do the same thing:

gritbox
    const raw = grit`
        raw = q1 chs* q2
        chs = !q2 [']*[^']*
        q1  = [']+  : save
        q2  = [']+  : match
    `;
    raw.actions = {
        raw: ([_,x]) => x.join(''),
        chs: ([_,x]) => x,
        save: (x) => raw.quotes = x,
        match: (x) => x == raw.quotes || null
    }

    const test = `'''xx ''y'' zz'''`;

    write(raw.parse(test));

The `q1` and `q2` are the outer quote marks, which must be the same. The `save` function records the `q1` open quote marks, and the `match` function checks that `q2` is the same as `q1`. A `null` result from `match` action function will cause the `q2` rule to fail.

The text between the outer quote marks can contain anything except the `q2` end quote, so any characters that do not contain a quote mark, or any sequence of quote marks that do not match `q2` can be accepted.

It is a good convention to give the `save` and `mark` functions meaningful names that are explicit in the grammar rules. This will help readers to spot the fact that these grammar rules depend on their action functions.


##  XML Tag Matching

XML (and HTML) can not be fully specified with a context-free grammar. Matching the start and end tag names requires a context-sensitive grammar.

However, a context-free grammar can be used for the XML syntax without the tag match check. Verification that the tag names match can be done separately after the parser has matched the nested element structure.

Here is the essence of the XML element grammar:

gritbox
    const html = grit`
        element = '<' tag '>' content '</' tag '>'
        content = (element / text)*
        tag     = \w+
        text    = [^<]*
    `;

    const test = `<i>xx<b>yy</b>zz</i>`;

    write( html.parse(test) );

The example shows correctly matching tags, but this grammar will match any tag names.

An extended regex with back matching can not be used here because the `content` between the tags can contain nested elements, and a regular expression can not handle that.

Action functions can be added to the grammar to ensure that the tags match:

gritbox
    const html = grit`
        element = '<' tag1 '>' content '</' tag2 '>'
        content = (element / text)*
        tag1    = \w+  : save
        tag2    = \w+  : match
        text    = [^<]*
    `;

    html.tags = [];

    html.actions = {
        save: (tag) => 
            html.tags.push(tag),
        match: (tag) => 
            html.tags.pop() == tag || null
    }

    const test = `<i>xx<b>yy</i>zz</b>`;

    write( html.parse(test) );

The tags need to be pushed onto a stack to allow the content to contain nested elements.


##  Nested Indentation

Nested indentation syntax, as used in Python, has a block structure based on lines with the same inset. The inset on the first line in a block can be any number of space characters, and subsequent lines in the same block must be inset with the same number of space characters. 

For example:

    if x:
        if y:
            print("x & y")
        if z:
            print("x & z")
    print("x done...")

A sketch for the grammar of this block structure:

    block  = indent line inlay* undent
    inlay  = body / block
    body   = inset line

The first line of a block can have any `indent`, and subsequent lines in the block must have the same `inset`. A block nested inside an outer block must have a larger `inset`. In other words:

    indent > parent.indent
    inset = parent.indent 

These constraints can be enforced in action functions:

gritbox
    const nest = grit`
        block  = indent line inlay* undent
        inlay  = body / block
        body   = inset line
        indent = [ ]* : push
        inset  = [ ]* : match
        undent = ''   : pop
        line   = [^\n\r]* nl
        nl     = \n|\r\n?|$
    `;

    nest.inset = -1;
    nest.stack = [];

    nest.actions = {
        block: ([_,ln,lns]) => [ln,lns],
        body: ([_,ln]) => ln,
        push: (x) => 
            x.length > nest.inset?
                nest.stack.push(nest.inset) 
                && (nest.inset = x.length)
                : null,
        pop: () => 
            nest.inset = nest.stack.pop(),
        match: (x) =>
            x.length == nest.inset? x : null,
        line: ([ln,_]) => ln
    };

    const test = `
    if x:
        if y:
            print("x & y")
        if z:
            print("x & z")
    print("x done...")
    `;

    print(nest.parse(test));

The insets could be extended to allow tabs, but trying to mix tabs with spaces should be avoided. 


##  Context Sensitive Grammars

A classic academic test case that requires a context-sensitive grammar is A^(n)B^(n)C^(n) where the number of As and Bs and Cs must be the same. This is not possible with context-free grammar rules alone, but it is very simple with the help of an action function:

gritbox
    const abc = grit`
        abc = 'a'+ 'b'+ 'c'+  : all_eq
    `;

    abc.actions = {
        all_eq: ([as,bs,cs]) => 
            (as.length == bs.length) &&
            (bs.length == cs.length) || null
    }

    const test = `aaabbbccc`;

    write( abc.parse(test) );

From an academic perspective this is cheating! It is too simple.

The point is that an action function can do anything, so solving the problem this way opens up Pandoras box, any program code could be used to do anything.

However, in practice being able to extend the grammar rules on occasion may be the only practical solution. In this case the grammar rule extension is clear and obvious. 

Formal grammar rules to solve this problem are usually very complex and hard to understand.  

As it happens a PEG grammar can go a little beyond a context-free grammar, so it is possible to specify the A^(n)B^(n)C^(n) grammar, but it not is not a very attractive solution:

gritbox
    const abc = grit`
        abc = &(A 'c') 'a'+ B end
        A   = 'a' A? 'b'
        B   = 'b' B? 'c'
        end = ![\s\S]
    `;

    const test = `aaabbbccc`;

    write( abc.parse(test) );

The `A` rule will match an equal number of `a`'s and `b`'s, and the `&` operator will check that this is true, but it will not consume any input. All the `a`'s can be matched now, and the `B` rule ensures that the same number of `b`'s and `c`'s are matched.

In general there is no easy way to specify a context-sensitive grammar. Attempts to push grammar rules beyond a context-free grammar have ended up with rules that are very complex and difficult to understand. The [§-calculus] is a modern formal grammar system designed to tackle the very difficult problems of context-sensitive languages (Quinn Tyler Jackson, Adapting to Babel, Adaptivity & Context-Sensitivity in Parsing, 2006).

[§-calculus]: https://www.amazon.ca/Adapting-Babel-Adaptivity-Context-Sensitivity-Parsing/dp/1505652723


##  Conclusion

Almost all practical computer languages and formats can be specified with a context-free grammar, but there are a few important exceptions that need to be dealt with in practice.

A PEG grammar is simpler than a traditional context-free grammar, but it can specify any unambiguous context-free language (and some context-sensitive grammars). It is deterministic, so it can not handle the syntactic ambiguity that a natural (human) language may require. For computer applications ambiguity is always undesirable and never required, so a PEG grammar is a very neat solution.

The Grit grammar rules are based on PEG logic, and they allow regular expressions to be used directly as components in the grammar rules. This allows the grammar rules to specify an efficient parser for any non-ambiguous context-free language.

Action functions can be used for the exceptions that do not fit into a context-free grammar. They can be used to extend the rules. Action functions allow the full power of the host programing language to be employed, so they are dangerous and could be abused. However, using action functions to cope with awkward grammar features can be kept simple and easy to understand. They are a very practical solution.



scribe
    gritbox  ./lib/gritbox.js


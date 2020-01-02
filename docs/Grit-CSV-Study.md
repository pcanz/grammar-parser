#	Grit CSV Study

CSV (Comma Separted Variable) is a text file format that is commonly used to transfer spread-sheets and data-base tables.

This note uses the Grit parser to specify and automate CSV grammar rules. A basic knowledge of Grit grammar rules is assumed.

The [CSV format] is simple enough, but there are lots of variations on a theme. Let's start with the [IETF RFC 4180] grammar rules. This is a defacto standard (it is not a formal standard, it is information for the Internet community).

[CSV format]: https://en.wikipedia.org/wiki/Comma-separated_values
[IETF RFC 4180]: https://tools.ietf.org/html/rfc4180

Later we will talk about how to modify the grammar to accommodate different requirements. But the first step is to automate the RFC 4180 grammar.

Here it is, a cut-and-paste copy, directly from the specification:

```eg
	RFC 4180  Common Format and MIME Type for CSV Files  October 2005

	file = [header CRLF] record *(CRLF record) [CRLF]
	header = name *(COMMA name)
	record = field *(COMMA field)
	name = field
	field = (escaped / non-escaped)
	escaped = DQUOTE *(TEXTDATA / COMMA / CR / LF / 2DQUOTE) DQUOTE
	non-escaped = *TEXTDATA
	COMMA = %x2C
	CR = %x0D         ;as per section 6.1 of RFC 2234 [2]
	DQUOTE =  %x22    ;as per section 6.1 of RFC 2234 [2]
	LF = %x0A         ;as per section 6.1 of RFC 2234 [2]
	CRLF = CR LF      ;as per section 6.1 of RFC 2234 [2]
	TEXTDATA =  %x20-21 / %x23-2B / %x2D-7E
```

These rules use the IETF ABNF grammar format, which is a little different from Grit grammar rules. The main thing we need to do is change the ABNF prefix format into the Grit postfix format, and change the ABNF literal notations into regular expression components:

``` sandbox
const rfc = grit`
  file        = (header CRLF)? 
                record (CRLF record)* CRLF?
  header      = name (COMMA name)*
  record      = field (COMMA field)*
  name        = field
  field       = escaped / non_escaped
  escaped     = DQUOTE (TEXTDATA / COMMA /
                        CR / LF / DQ2)* DQUOTE
  non_escaped = TEXTDATA*
  COMMA       = [\x2C]
  DQUOTE      = [\x22]
  DQ2         = [\x22]{2}
  CR          = [\x0D]
  LF          = [\x0A]
  CRLF        = CR LF
  TEXTDATA    = [\x20-\x21\x23-\x2B\x2D-\x7E]
`;

test = `a,b,c\r\nd,e,f`;

write(rfc.parse(test));
```

That's it, a very literal transliteration of the RFC 4180 grammar specification, but it can now be run as a parser.

The parse tree result for our little test input is rather messy, but we will clean that up later. Before that it is best to work on the grammar rules, and check that they match input test strings as expected.

We can simplify the grammar significantly by taking more advantage of Grit notations:

``` sandbox
const rfc = grit`
  file      = (header CRLF)?
               record (CRLF record)* CRLF?
  header    = name (',' name)*
  record    = field (',' field)*
  name      = field
  field     = escaped / TEXTDATA*
  escaped   = ('"' [^"]* '"')+
  CRLF      = \r\n
  TEXTDATA  = [\x20-\x21\x23-\x2B\x2D-\x7E]
`;

test = `a,b,c\r\nd,e,f`;

write(rfc.parse(test));
```
Quoted characters are easier to read than names that are defined as numeric character codes. Although a standards body may prefer to spell out the numeric character codes explicitly.

The `escaped` rule has been simplified to eliminate the need to mention doubling double-quotes (the `DQ2` which is used to escape quote marks). The trick is that the overall text for one big quoted string that contains doubled quote escapes is exactly the same as the total text for a concatenated sequence of separate quoted strings.

The RFC specification allows the option for the first record to be a header line. But the syntax is identical, there is no difference between the `header` rule and the `record` rule.

It seems best to simply eliminate the header option from the grammar rules. The grammar has nothing to say about how the application may decide if the first record is a header record or not.

``` sandbox
const rfc = grit`
  file      = records CRLF?
  records   = record (CRLF record)*
  record    = field (',' field)*
  name      = field
  field     = escaped / TEXTDATA*
  escaped   = ('"' [^"]* '"')+
  CRLF      = \r\n
  TEXTDATA  = [\x20-\x21\x23-\x2B\x2D-\x7E]
`;

test = `a,b,c\r\nd,e,f`;

write(rfc.parse(test));
```
RFC 4180 is very restrictive, it requires a line break to use the Internet standard and will not accept the common Unix line break convention. It also restricts the record data to ASCII characters.


##  Parser

A practical parser should be more permissive than the strict RFC 4180 specification. This next grammar will accept the RFC 4180 format as a subset, but allows Unicode characters, and accepts any of the common line break conventions:

``` sandbox
const csv = grit`
  file    = eol record+
  record  = row eol
  row     = (field ','?)+
  field   = esc / txt
  esc     = ('"' [^"]* '"')+
  txt     = [^,\n\r]*
  eol     = [\n\r]*
`;

test = `
a,b,c,
d,"e,f""g",h
`;

write(csv.parse(test));
```
The `eol` rule matches any of the common line break conventions, and it will also skip over any number of empty lines. This makes the parser robust in the face of human editors who may edit a CSV and inadverently add some unnecessary empty lines.

The `eol` will also match zero line break characters, so leading and trailing line breaks will be accepted, but they are not required (they are not allowed in RFC 4180).

The `record` rule has been simplified and it makes a trailing comma at the end of a record optional. If there is a trailing comma then an extra empty field will be matched at the end of the reocord.

It may not be so obvious, but a `record` rule will also accept a comma at the start of a record, because the first `field` can be empty.


##	The Parse Tree

Ideally we want the parse tree result to be a simple list (array) of records, each of which contains a list (array) of string values. This is a good structure for a formal AST (Abstract Syntax Tree) to represent tablular data.

You may know that your application wants some other format, such as an HTML or XML, but that is best ignored for now. At this point it is enough to focus on the syntax of the CSV data, and generating a nice clean array or records. Other translations can be added later.

The `file` and `record` rules are easy to clean up, an action function can simply ignore the `eol` elements.

The `row` rule will match a sequence of `field` and comma vaules, but we only want the field value. The `row` action function deletes the commas.

The `escaped` rule matches a full quoted field. The outer quotes not part of the field, but any internal doubled quotes represent a quote character. An action function can sort this out by simply taking the text between each pair of quote marks and joining these texts together with a quote character. 

``` sandbox
const csv = grit`
  file    = eol record+
  record  = row eol
  row     = (field ','?)+
  field   = esc / txt
  esc     = ('"' [^"]* '"')+
  txt     = [^,\n\r]*
  eol     = [\n\r]*
`;
csv.actions = {
  file: ([_,records]) => records,
  record: ([row,_]) => row,
  row: (fs) => fs.map(([f,_]) => f),
  esc: (es) => es.map(([_,e])=>e).join('"')
};

test = `
a,b,c,
d,"e,f""g",h
`;

write(csv.parse(test));
```

Great, that's exactly what we wanted to see. A nice simple array of records containing string values.  The test case shows that an empty last field is matched, and the escaped quotes are working.


##  CSV Variants

CSV files do not necessarily use a comma as the field delimeter (despite the CSV name). Sometimes they are called DSV (Delimiter Separated Value) files, or if a tab delimiter is used then they may be called TSV files. A semi-colon delimiter is a very common variant, and they are usually called CSV files.

For example, MS Excel CSV files will use a semicolon instead of a comma if the locale is a country where numbers have a comma as the decimal point separator.

CSV variants do not all use exactly the same quoted field syntax as RFC 4180. Apple Numbers CSV files quote any fields that contain delimiter characters, but quote marks inside a quoted field are not doubled.

Other variants may not use quotes at all, instead they may use a back-slash to escape delimiter characters.

We can not cover all the possible CSV variants, but we can extend our grammar to cover many of the common variants.

### Field Delimiters

To make it easier to change the delimiter we will revise the grammar so that the delimiter character appears only once in the grammar, in the `txt` rule. The `row` rule can accept any character as a field delimiter, other than an end of line character.

``` sandbox
const csv = grit`
  file    = eol record+
  record  = row eol
  row     = (field [^\n\r]?)+
  field   = esc / txt
  esc     = ('"' [^"]* '"')+
  eol     = [\n\r]*
  txt     = [^,\n\r]*
`;
csv.actions = {
  file: ([_,records]) => records,
  record: ([row,_]) => row,
  row: (fs) => fs.map(([f,_]) => f),
  esc: (es) => es.map(([_,e])=>e).join('"')
};

test = `
a,b,c,
d,"e,f""g",h
`;

write(csv.parse(test));
```
This grammar can be easily edited to change the comma delimeter to any other character. Only the last `txt` rule needs to be edited. If the delimeter needs to be assigned dynamically then the Grit grammar rules can be modified as a string value before the string is given to the `grit` function.

An application may be able to discover the required delimiter character by examination of the CSV input file, or the delimiter may be specified as an external parameter.

### Escapes

The grammar can be modified to accomodate the Apple CSV variant where quotes inside quoted fields are not doubled. It also continues to accept the RFC 4180 standard doubled quotes.

This can be done because the final quote mark of an escaped field must be immediately followed by either a comma or a line end. A quote character inside a field value can therefore be accepted if it is followed by any character other than a (second) quote, a field delimeter, or a line break.

``` sandbox
const csv = grit`
  file    = eol record+
  record  = row eol
  row     = (field [^\n\r]?)+
  field   = esc / text
  esc     = ('"' chs* '"')+
  chs     = [^"]* skip?
  skip    = '"' !'"' txt
  eol     = [\n\r]*
  text    = txt*
  txt     = [^,\n\r]
`;
csv.actions = {
  file: ([_,records]) => records,
  record: ([row,_]) => row,
  row: (fs) => fs.map(([f,_]) => f),
  esc: (es) => es.map(([_,chs])=>
                chs.join('')).join('"'),
  chs: (cs) => cs.join(''),
  skip: ([q, _, x]) => q+x,
  text: (ts) => ts.join('')
};

test = `
a,b,c,
d,"e,f"g",h
`;

write(csv.parse(test));
```
This parser can have the comma in the `txt` rule changed to any other delimeter, and it can parse most of the common CSV formats exported from speread-sheets and data-base applications.

We can extend this grammar to also accept back-slash escaped characters: 

``` sandbox
const csv = grit`
  file    = eol record+
  record  = row eol
  row     = (field [^\n\r]?)+
  field   = esc / text
  esc     = ('"' chs* '"')+
  chs     = [^"]* skip?
  skip    = '"' !'"' txt
  eol     = [\n\r]*
  text    = (bs / txt)*
  bs      = [\\] [^]
  txt     = [^,\\\n\r]
`;
csv.actions = {
  file: ([_,records]) => records,
  record: ([row,_]) => row,
  row: (fs) => fs.map(([f,_]) => f),
  esc: (es) => es.map(([_,chs])=>
                chs.join('')).join('"'),
  chs: (cs) => cs.join(''),
  skip: ([q, _, x]) => q+x,
  text: (ts) => ts.join(''),
  bs: ([_, x]) => x
};

test = String.raw`
a,b,c,
d,e\,f"g,h
`;

write(csv.parse(test));
```

Only the `txt` rule needs to be edited to specify the feild delimiter and to determine if back-slash escapes are to be used (if the `txt` does not exclude back-slash characters then they will be accepted as normal characters).

If this back-slash escape option is used then it will be applied to any character following a back-slach, and two back-slash characters are therefore needed for the back-slash itself.

To demonstrate, the next example starts with a `csv-rules` grammar that is defined for the RFC 4180 standard, extended to accept single or doubled quote marks inside quoted fields.

A `dsv_rules` grammar is derived from the `csv_rules` by replacing the comma delimiter with a `|` character, and allowing back-slash escapes.

The `dsv_rules` grammar is then applied to an example of the table format used in (extended) Markdown documents where:

1. A bar "|" is used as the field separator (instead of a comma).
2. Optional bar "|"s are allowed at the beginning and end of a row.
3. A "|" is escaped as "\\|" (instead of quoting the field).


``` sandbox
const csv_rules = String.raw`
  file    = eol record+
  record  = row eol
  row     = (field [^\n\r]?)+
  field   = esc / text
  esc     = ('"' chs* '"')+
  chs     = [^"]* skip?
  skip    = '"' !'"' txt
  eol     = [\n\r]*
  text    = (bs / txt)*
  bs      = [\\] [^]
  txt     = [^,\n\r]
`;

const csv_actions = {
  file: ([_,records]) => records,
  record: ([row,_]) => row,
  row: (fs) => fs.map(([f,_]) => f),
  esc: (es) => es.map(([_,chs])=>
                chs.join('')).join('"'),
  chs: (cs) => cs.join(''),
  skip: ([q, _, x]) => q+x,
  bs: ([_, x]) => x,
  text: (ts) => ts.join('')
};

test = String.raw`
| A | B      | C |
|:--|:------:|--:|
| a | b      | c |
| d | e\|f   | g |
`;

const dsv_rules = csv_rules.replace("^,", "^|\\");

const csv = grit(dsv_rules, csv_actions);

write(csv.parse(test));
```
This demonstrates how a CSV grammar could be packaged up with the ability to specify the field delimiter character and/or back-slash escape via an external parameter. That would cover many of the common CSV variants.


##  Transformer

The action functions can be enhanced with application processing so that the parser acts as a transformer function for the input string. For example, if the application is to take a CSV table and transform it into an HTML table, then the action functions can be enhanced like this:

``` sandbox
const csv = grit`
  file    = eol record+
  record  = row eol
  row     = (field ','?)+
  field   = esc / txt
  esc     = ('"' chs* '"')+
  chs     = [^"]* skip?
  skip    = ["][^",\n\r]
  txt     = [^,\n\r]*
  eol     = [\n\r]*
`;
csv.actions = {
  file: ([_,records]) => 
    "<table>"+records.join('')+"</table>",
  record: ([row,_]) => "<tr>"+row+"</tr>",
  row: (fs) => fs.map(([f,_]) => 
               "<td>"+f+"</td>").join(''),
  esc: (es) => es.map(([_,chs])=>
                chs.join('')).join('"'),
  chs: (cs) => cs.join('')
};

test = `
a,b,c,
d,"e,f""g",h
`;

write(csv.parse(test));
```
Integrating the application processing with the parser action functions like this can be neat and efficient in some cases. But for more complicated applications it is better to keep the application processing separate. The parser can use the action functions to generate a sutabile AST (Abstract Syntax Tree) for the application to process.

Transforming a Markdown table into HTML is best handled with a separate AST:

``` sandbox
const csv = grit`
  file    = eol record+
  record  = row eol
  row     = (field '|'?)+
  field   = (esc / txt)*
  esc     = [\\] [^]
  txt     = [^|\\\n\r\\]*
  eol     = [\n\r]*
`;
csv.actions = {
  file: ([_,records]) => records,
  record: ([row,_]) => row,
  row: (fs) => 
    (fs[0][0]===""? fs.slice(1) : fs)
      .map(([f,_]) => f),
  field: (fs) => fs.join(''),
  esc: ([_,x]) => x==="|"? "|" : "\\"+x
};

test = String.raw`
| A | B      | C |
|:--|:------:|--:|
| a | b      | c |
| d | e\|f   | g |
`;

var ast = csv.parse(test);
write(ast);

var html = process(ast);
write(html);

function process(ast) {
    var hdr = header(ast[0]);
    var css = ruler(ast[1]);
    var bdy = body(ast.slice(2));
    return "<table>"+hdr+bdy+"</table>";
}
function ruler(row) {
    // ... generate CSS for alignment ....
}
function header(row) {
    var hd = row.map((x) => "<hd>"+x+"</hd>")
    return "<hr>"+hd+"</hr>";
}
function body(rows) {
    return rows.map((row) => "<tr>"+
      row.map((fld) => 
        "<td>"+fld+"</td>").join('')
      +"</tr>");
}
```
This example illustrates a nice clean separation of concerns:

1. The grammar rules to parse the syntax.
2. The action functions to generate a clean AST.
3. Tha application transforming the AST (into HTML).


## Conclusion

Grammar rules make good specifications, and it is not hard to transliterate other grammar rules (such as an IETF ABNF grammar) into Grit grammar rules.

A Grit grammar automatically implements a parser, but a parser may need to be more permissive than a strict grammar specification. Implementations should follow a general principle of robustness: be conservative in what you send, be liberal in what you accept from others ([Postel]).

[Postel]: https://en.wikipedia.org/wiki/Robustness_principle

Grammar rules often look deceptivley simple, but the full implications of a grammar can be difficult to understand. To design a good grammar it is best to start with the smallest simple set of rules that can represent the basic syntax. The grammar rules can then be refined, expanded, and tested.

It is usually best to ignore the parse tree output until the basic grammar rules are satisfactory. After that action functions can be added to translate the default syntax tree into an more formal AST appropriate for the application.

In summary a grammar-parser can be developed in stages:

1. First the grammar as a specification, without any action functions.

2. Then as a syntax parser, with minimal actions to generate a simple parse tree.

3. Now for exploration and testing to verify the syntax and relax input restrictions.

4. Finally enhance the actions to generate an AST or other output.

After a little practice it is tempting to do more and more with a grammar and integrate the application into the grammar rules and their semantic actions. But it is desirable to keep the grammar as close to an ideal specification as possible. An application program can process the parse tree with a global view and take pragmatic trade-offs that are best left out of the grammar specification.

The ability to run a grammar specification as a parser is a delight, and it makes a very powerful tool.


<style type="text/css">
	body {
		font-family: 'Helvetica Neue', Helvetica, Arial, serif;
		font-size: 1em;
		line-height: 1.5;
		color: #505050;
	}
	code.language-eg { display:block; background:whitesmoke; margin:0pt 10pt;}
</style>


#   A Grit Grammar Parser For JSON

JSON is specified in three places:

1. Douglas Crockford's web page: <http://www.json.org>
2. IETF 8259: <https://tools.ietf.org/html/rfc8259>
3. ECMA 404: <http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf>

IETF 8259 and ECMA 404 specify the same JSON language, with mutual agreement to correct any differences that may be discovered. 

The ECMA 404 standard uses a "railway track" diagram format to specify the syntax, but it is reasonably easy to construct Grit grammar rules from these diagrams.

The grammar rules specified in IETF 8259 use the IETF standard ABNF grammar rule format, which can be translated into equivalent Grit grammar rules.

The grammar rules specified in Douglas Crockfords's original web-page are most easily transcribed into Grit grammar rules:

``` sandbox
const json = grit`
    json     = ws value ws
    value    = object / array / string / number / literal
    object   = "{" members? "}"
    members  = member ("," member)*
    member   = string ":" value
    array    = "[" values? "]"
    values   = value ("," value)*
    string   = '"' chars* '"'
    chars    = [^\x00-\x1f"\\]+ / '\' escape
    escape   = ["\\/bfnrt] / [u][0-9a-fA-F]{4}
    number   = integer fraction? exponent?
    integer  = [-]?[1-9][0-9]+ / [-]?[0-9]
    fraction = [.][0-9]+
    exponent = [eE][+-]?[0-9]+
    literal  = "true" / "false" / "null"
    ws       = [ \n\r\t]*
`;

var p = json.parse(`
  { 
    "hi": "Hello World!",
    "ans": 42,
    "bye": "thanks for \\n all the fish.."
  }
`);

write(p);
```
The Grit grammar is easy to read and understand, and it corresponds directly with the JSON specification. The advantage of the Grit grammar rules over the other spcifications is that it can be automatically executed as a parser.

Action functions can be added to translate the rule results into JavaScript data structures:

``` sandbox
const json = grit`
    json     = ws value ws
    value    = object / array / string / number / literal
    object   = "{" members? "}"
    members  = member ("," member)*
    member   = string ":" value
    array    = "[" values? "]"
    values   = value ("," value)*
    string   = '"' chars* '"'
    chars    = [^\x00-\x1f"\\]+ / escape
    escape   = [\\]["\\/bfnrt] / [\\][u][0-9a-fA-F]{4}
    number   = integer fraction? exponent?
    integer  = [-]?[1-9][0-9]+ / [-]?[0-9]
    fraction = [.][0-9]+
    exponent = [eE][+-]?[0-9]+
    literal  = "true" / "false" / "null"
    ws       = [ \n\r\t]*
`;

json.actions = {
    json: ([_,x]) => x,
    object: ([_,x]) => x,
    members: ([m,ms]) => {
        var obj = {};
        if (!m) return obj;
        const mem = ([k,_,v]) => obj[k] = v===undefined? null:v;
        mem(m);
        ms.forEach(([_,kv]) => mem(kv));
        return obj;
    },
    array: ([_,x]) => x,
    values: ([v,vs]) => {
        var arr = [];
        if (!v) return arr;
        arr.push(v===undefined? null:v);
        vs.forEach(([_,v]) => arr.push(v===undefined? null:v));
        return arr;
    },
    string: ([_,s]) => s.join(''),
    number: (xs) => Number(xs.join('')),
    literal: (s) => s[0]==="t"? true : (s[0]==="f"? false : undefined)
};

var p = json.parse(`
  { 
    "hi": "Hello World!",
    "ans": 42,
    "arr": [1,2,"three",[true,null]],
    "bye": "thanks for \\n all the fish.."
  }
`);

write(p);
```
There is a problem with translating the JSON "null" value into a JavaScript `null` value. A `null` value can not be returned by an action function since that would be interpreted as the rule failing to match the input text.

For this reason the JSON "null" value is interpreted as a JavaScript `undefined` value. This is not an unreasonable JavaScript interpretation of a JSON "null" value. However, to conform with the standard implementation the `values` and `members` semantic action functions substitute the `null` value for any `undefined` values in the resulting JavaScript data structures.

There is a small defect in the JSON specification for JavaScript strings. JSON allows the Unicode line terminators U+2028 LINE SEPARATOR and U+2029 PARAGRAPH SEPARATOR to appear unescaped in quoted strings, these characters are illegal in JavaScript strings (ECMAScript).

Of course there are standard JSON parsers for JavaScript and many other programming languages that are well supported and battle tested. The Grit version is just a demonstration, to show that it is simple to implement and easy to understand. It follows directly from the specifications, and the resulting parser is practical and efficient. 

For comparison here are the original JSON grammar rule specifications:

``` eg
    json
        element

    value
        object
        array
        string
        number
        "true"
        "false"
        "null"

    object
        '{' ws '}'
        '{' members '}'

    members
        member
        member ',' members

    member
        ws string ws ':' element

    array
        '[' ws ']'
        '[' elements ']'

    elements
        element
        element ',' elements

    element
        ws value ws

    string
        '"' characters '"'

    characters
        ""
        character characters

    character
        '0020' . '10ffff' - '"' - '\'
        '\' escape

    escape
        '"'
        '\'
        '/'
        'b'
        'f'
        'n'
        'r'
        't'
        'u' hex hex hex hex

    hex
        digit
        'A' . 'F'
        'a' . 'f'

    number
        integer fraction exponent

    integer
        digit
        onenine digits
        '-' digit
        '-' onenine digits

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

    ws
        ""
        '0020' ws
        '000D' ws
        '000A' ws
        '0009' ws
```

``` replace
"   smart
'   smart
```

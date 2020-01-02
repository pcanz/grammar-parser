#   TOML

[TOML] does not have a formal grammar specification, although it does now have a draft proposal for an [ABNF grammar].

[TOML]: https://github.com/toml-lang/toml

[ABNF grammar]: https://github.com/toml-lang/toml/blob/master/toml.abnf

This Grit grammar is derived from the [TOML] v0.5.0 English language definition.

``` sandbox
const toml = grit`
    toml     = term*
    term     = ws item ln
    item     = comment / keyval / table / array / err
    keyval   = key eq value
    table    = "[" key "]"
    array    = "[[" key "]]"
    key      = name ("." name)*
    name     = [a-zA-Z0-9_-]+ / string
    value    = string / date / number / boolean / arr / obj
    arr      = "[" vals? "]"
    vals     = value ("," value)*
    obj      = "{" keyvals? "}"
    keyvals  = keyval ("," keyval)*  
    string   = basic / literal
    basic    = ["]{3} (chars / '\' nl)* ["]{3} / ["] chars* ["]
    literal  = [']{3} (chs / [\n\r])* [']{3} / ['] chs* [']
    chs      = [^\x00-\x08\x0A-\x1F\x7F]+
    chars    = [^\x00-\x08\x0A-\x1F\x7F"\\]+ / '\' escape
    escape   = ["\\/bfnrt] / [u][0-9a-fA-F]{4} / [U][0-9a-fA-F]{8}
    boolean  = "true" / "false"
    date     = datum ([T ] time)? / time
    datum    = \d{4}[-]\d\d[-]\d\d
    time     = \d\d:\d\d:\d\d ([.]\d+)? ('Z' / [-+]\d\d:\d\d)?
    number   = base / numeric / limit
    numeric  = [-+]? integer fraction? exponent?
    integer  = [1-9][0-9_]+ / [0-9]
    fraction = [.][0-9]+
    exponent = [eE][-+]?[0-9]+
    limit    = [-+]? ('inf' / 'nan')
    base     = '0x' hex / '0o' octal / '0b' bin
    hex      = [0-9a-fA-F][0-9a-fA-F_]*
    octal    = [0-7][0-7_]*
    bin      = [0-1][0-1_]*
    eq       = sp [=] sp
    ln       = sp comment? nl*
    comment  = [#][^\n\r]*
    err      = [^\n\r]* nl*
    sp       = [ \t]*
    ws       = \s*
    nl       = \n|\r\n?
`;

var p = toml.parse(`
# This is a TOML document.

title = "TOML Example"

[owner]
name = "Tom Preston-Werner"
dob = 1979-05-27T07:32:00-08:00 # First class dates

[database]
server = "192.168.1.1"
ports = [ 8001, 8001, 8002 ]
connection_max = 5000
enabled = true

[servers]

  # Indentation (tabs and/or spaces) is allowed but not required
  [servers.alpha]
  ip = "10.0.0.1"
  dc = "eqdc10"

  [servers.beta]
  ip = "10.0.0.2"
  dc = "eqdc10"

[clients]
data = [ ["gamma", "delta"], [1, 2] ]

# Line breaks are OK when inside arrays
hosts = [
  "alpha",
  "omega"
]
`);

write(p);
```
This grammar has not yet been tested or used.

####    Notes

The spec says numeric values may have an underscore *between* digits, which excludes a trailing underscore, but this Grit grammar would allow that.



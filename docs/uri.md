#   A Grit URI Parser

The URI format is defined by the IETF [RFC 3986] specification.

[RFC 3986]: https://tools.ietf.org/html/rfc3986

The IETF RFCs uses [ABNF] grammar rules, but it is reasonably easy to transliterate ABNF rules into Grit grammar rules. 

Here is the first ABNF rule:

[ABNF]: https://tools.ietf.org/html/rfc5234

``` eg
    URI = scheme ":" hier-part [ "?" query ] [ "#" fragment ]
```

In Grit this can be written as:

``` eg
    URI = scheme ':' hier-part ('?' query)? ('#' fragment)?
```
In ABNF square brackets are used for optional components, but in Grit square brackets are used in regular expression components. The double quotes have been changed to single quotes becaue in Grit double quotes allow white-space before and after the quoted literal, and a URI can not contain any white-space.

We could go on and translate the full ABNF specification into a Grit grammar, but [RFC 3986] also provides this regular expression to match a URI:

``` eg
    ^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?
```
We can break this regular expression into component parts as named rules in a Grit grammar:

``` sandbox
const uri = grit`
    URI       = scheme? authority? path query? fragment?
    scheme    = [^:/?#]+ ':'
    authority = '//' [^/?#]*
    path      = [^?#]*
    query     = '?' [^#]*
    fragment  = '#' \S*
`;

var test = "http://www.ics.uci.edu/pub/ietf/uri/#Related";

write(uri.parse(test));
```
This grammar matches in exactly the same way as the regular expression.

We can use action functions to generate a more useful result:

``` sandbox
const uri = grit`
    URI       = scheme? authority? path query? fragment?
    scheme    = [^:/?#]+ ':'
    authority = '//' [^/?#]*
    path      = [^?#]*
    query     = '?' [^#]*
    fragment  = '#' \S*
`;
uri.actions = {
    URI: ([scheme, authority, path, query, fragment]) =>
        ({scheme, authority, path, query, fragment}),
    scheme: ([s,_]) => s,
    authority: ([_,s]) => s,
    query: ([_,s]) => s,
    fragment: ([_,s]) => s
}

var test = "http://www.ics.uci.edu/pub/ietf/uri/#Related";

print(uri.parse(test));
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


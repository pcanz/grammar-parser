#   Grit Grammar Parser

The grit-parser makes grammar rules as easy to use as regular expressions.

##  Node.js Usage

    npm install grit-parser

## Example

    const grit = require("grit-parser");

    const mdy = grit`
        date  = month '/' day '/' year
        day   = \d+
        month = \d+
        year  = \d{4}
    `;

    var p = mdy.parse("3/4/2019");

    console.log(p); // [ '3', '/', '4', '/', '2019' ]

##  Dependencies

    None

The `grit-parser.js` file is complete and self-contained, it has no external dependencies, and it exports a single function.

##  Other Usage

Take a copy of the file: `grit-parser.js`
    
- Browser: load the `grit-parser.js` file. 
- Node.js: require("./grit-parser.js");   

##  Documentation

Introduction: https://pcanz.github.io/grammar-parser/introduction.md.html

Web-site: https://pcanz.github.io/grammar-parser/



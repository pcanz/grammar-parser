#   Grit Grammar Parser

The grit-parser makes grammar rules as easy to use as regular expressions.

##  Usage

    npm install grit-parser

    or require the `grammar-parser.js` file in Node.js
    
    or load the `grammar-parser.js` file directly into a browser.    

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

The `grammar-parser.js` file is complete and self-contained, it has no external dependencies, and it exports a single function.

##  Documentation

Introduction: https://pcanz.github.io/grammar-parser/introduction.md.html

Documentation is in the `docs` folder, see: https://pcanz.github.io/grammar-parser/



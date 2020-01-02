const tests = [
    // 0
    { rules: String.raw`
        S =  ''
    `, inputs: [ "" ],
        expects: [ '' ]
    },
    { rules: String.raw`
        S =  ""
    `,  inputs: [ "", "  " ],
        expects: [ '', '' ]
    },
    { rules: String.raw`
        S =  'a'
    `,  inputs: [ "a"],
        expects: [ 'a' ]
    },
    { rules: String.raw`
        S =  "a"
    `, inputs: [ "a", "  a", "a ", " a "],
        expects: [ 'a','a','a','a' ]
    },
    { rules: String.raw`
        S = "a" 'b'
    `, // => ['a','b']
      inputs: [ "ab", " a b"]
    },
    // 5
    { rules: String.raw`
        S =  "a"+
    `, // => ["a","a","a"] // a list of strings
      inputs: ["a", "aaa", "  a  a a "]
    },
    { rules: String.raw`
    S =  [^]
    `, inputs: [ "a", "x" ],
        expects: [ 'a', 'x' ]
    },
    { rules: String.raw`
        S =  [a]
    `, inputs: [ "a" ],
        expects: [ 'a' ]
    },
    { rules: String.raw`
        S =  \d+
    `, inputs: ["123"],
        expects: [ '123' ]
    },
    { rules: String.raw`
        S =  \s*\d+
    `, inputs: ["  123"],
        expects: ["  123" ]
    },
    // 10
    { rules: String.raw`
        S =  \s*(\d+)
    `, inputs: ["123", "  123"],
       expects: ["123", "123"]
    },
    { rules: String.raw`
        S =  ^\s*(\d+)
    `, inputs: ["123", "  123"],
       expects: ["123", "123"]
    },
    { rules: String.raw`
        S =  ^([,])\s*
    `, inputs: [",", ",  "],
       expects: [",", ","]
    },
    { rules: String.raw`
        S =  name (comma name)*
        comma = ^([,])\s*
        name = \w+
    `, inputs: ["t", "t, d"],
       expects: [["t",[]], ["t",[[",","d"]]] ]
    },
    { rules: String.raw`
        S =  \s*(\d+(?:\w+\s*)+)
    `, inputs: ["123abc", "  123abc ", "1a b c"],
       expects: ["123abc", "123abc ", "1a b c"]
    },
    // 15
    { rules: String.raw`
        S =  \s*((\w+(\s*\d+)*)+)
    `, inputs: ["abc 123 456def 321"]
    },
    { rules: String.raw`
        S =  \s*((\w+(\s*\d+)*)+)
        `, inputs: [ "abc 123 456def 321" ]
    },
    { rules: String.raw`
        S = x y
        x = "a"
        y = [b]
    `, inputs: [ "ab" ],
        expects: [['a', 'b']]
    },
    { rules: String.raw`
        S = x / y
        x = "a"
        y = [b] `,
      inputs: [ "a", "b" ],
      expects: ['a', 'b']
    
    },
    { rules: String.raw`
    S = x+
    x = 'a'
    `, inputs: [ "a", "aa"],
        expects: [ ['a'], ['a','a']]
    },
    // 20
    { rules: String.raw`
    S = x*
    x = 'a'
    `, inputs: [ "", "a", "aa"],
        expects: [ [], ['a'], ['a','a'] ]
    },
    { rules: String.raw`
    S = x+ y
    x = 'a'
    y = 'b'
    `, inputs: [ "ab", "aab"],
        expects: [ [['a'],'b'], [['a','a'],'b']]
    },
    { rules: String.raw`
        S = (x y)+
        x = "a"
        y = [b]
    `, inputs: [ "ab", "  ab", "ababab"],
        expects: [ [['a','b']], [['a','b']], [['a','b'],['a','b'], ['a','b']] ]
    },
    { rules: String.raw`
        S = ('a'? 'b'?)+
    `, inputs: [ "", "a", "b", "ab"],
        expects: [ [['','']], [['a','']], [['','b']],[['a','b']] ]
    },
    { rules: String.raw`
        S =  !'x' [^] 'y' / "xxxx"
    `, inputs: ["yy", "zy", "xxxx"],
       expects: [ ["","y","y"], ["","z","y"], "xxxx"]
    },
    // 25
    { rules: String.raw`
        S =  ![x]{3} [^] 'y' / "xxx" [^]
    `, inputs: ["yy", "zy", "xxxz"],
       expects: [ ["","y","y"], ["","z","y"], ["xxx", "z"] ]
    },
    { rules: String.raw`
        S = 'a' S? 'b' `,
      inputs: [ "ab", "aaabbb"],
      expects: [ ['a','','b'], ['a', ['a', ['a','','b'],'b'],'b'] ]
    }
    
    
    ]; 

module.exports = tests;

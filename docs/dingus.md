#   Grit Playpen

``` sandbox

const greet = grit`
    hello = "Hello" who
    who   = [^]*
`;

var test = "Hello World!";

write(greet.parse(test));



---

const greet = grit`
    hello = "Hello" who etc
    who   = \w+
    etc   = [^]*
`;

greet.actions = {
    hello: ([_, who, etc]) => ({who, etc})
};

var test = "Hello World!";

print(greet.match(test));

/*  Notes:

- hello action function creates an object result
- match is the same as parse, but won't throw an exception
- print is a variant of write with JSON formatting

*/















```

* You can edit anything in the left hand (or top) text-area, then hit the **RUN** button to see what happens.

* Select on **Example** button to show other examples (restores original).

* Resize the windows as needed (drag at lower right corner).

* The buit-in global functions:

    * grit -- the grit-parser template literal function
    * write -- output JSON
    * print -- output JSON formatted

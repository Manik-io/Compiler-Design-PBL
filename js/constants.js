var EPSILON = "\u03b5";
var END = "$";
var activeParser = "ll1";
var lastResults = null;

var EXAMPLES = {
  arithmetic: {
    grammar: "E -> E + T | T\nT -> T * F | F\nF -> ( E ) | id",
    input: "id + id * id",
  },
  simple: {
    grammar: "S -> a S b | c",
    input: "a a c b b",
  },
  ifelse: {
    grammar: "S -> i E t S e S | i E t S | a\nE -> b",
    input: "i b t a e a",
  },
  balanced: {
    grammar: "S -> ( S ) S | \u03b5",
    input: "( ( ) )",
  },
};

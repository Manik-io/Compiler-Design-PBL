function buildLL1Table(grammar, firstSets, followSets) {
  var table = new Map();
  var conflicts = [];

  for (var nt of grammar.nonTerminals) table.set(nt, new Map());

  for (var i = 0; i < grammar.prods.length; i++) {
    var prod = grammar.prods[i];
    var lhs = prod.lhs;
    var rhs = prod.rhs;

    // Poore RHS ka FIRST nikal rahe hain, sirf pehle symbol ka nahi
    var firstRhs = firstOfSequence(rhs, firstSets);

    for (var t of firstRhs) {
      if (t === EPSILON) continue;

      var row = table.get(lhs);

      // Agar cell khali nahi hai, matlab ek hi jagah do rules aa rahe hain (Conflict)
      if (!row.has(t)) row.set(t, []);
      row.get(t).push(prod);

      if (row.get(t).length > 1) conflicts.push("M[" + lhs + ", " + t + "]");
    }

    // Agar FIRST mein epsilon hai, toh hum FOLLOW set ki madad lete hain
    if (firstRhs.has(EPSILON)) {
      var follow = followSets.get(lhs) || new Set();

      for (var t of follow) {
        var row = table.get(lhs);

        if (!row.has(t)) row.set(t, []);
        row.get(t).push(prod);

        // Yahan bhi check kar rahe hain ki FOLLOW ki wajah se koi overlap toh nahi hua
        if (row.get(t).length > 1) conflicts.push("M[" + lhs + ", " + t + "]");
      }
    }
  }

  return { table: table, conflicts: conflicts, isLL1: conflicts.length === 0 };
}

function parseLL1(grammar, table, inputTokens) {
  var tokens = inputTokens.concat([END]);
  var steps = [];

  // Stack setup: Bottom mein '$' (END) aur top mein Start Symbol rakhte hain
  var stack = [
    { sym: END, node: null },
    { sym: grammar.start, node: makeTreeNode(grammar.start, false) }
  ];

  var root = stack[stack.length - 1].node;

  var pos = 0;
  var step = 1;

  while (stack.length > 0) {
    var top = stack[stack.length - 1];
    var sym = top.sym;
    var node = top.node;
    var cur = tokens[pos] || END;

    if (sym === END) {
      // Agar stack aur input dono saath mein khatam ho jayein -> Successful Parsing
      if (cur === END) {
        steps.push({ step: step++, stack: stackStr(stack), input: tokens.slice(pos), action: "Accept" });
        return { steps: steps, accepted: true, tree: root };
      }

      steps.push({ step: step++, stack: stackStr(stack), input: tokens.slice(pos), action: 'Error: extra input' });
      return { steps: steps, accepted: false, tree: null };
    }

    if (grammar.terminals.has(sym)) {
      // Terminal Match: Agar stack ka top aur current input same hain toh pop kar do
      if (sym === cur) {
        steps.push({ step: step++, stack: stackStr(stack), input: tokens.slice(pos), action: 'Match "' + sym + '"' });
        stack.pop();
        pos++; 
      } else {
        steps.push({ step: step++, stack: stackStr(stack), input: tokens.slice(pos), action: 'Error: Mismatch' });
        return { steps: steps, accepted: false, tree: null };
      }
    } else {
      // Non-Terminal: Table se check karo ki is input ke liye kaunsa rule use karein
      var row = table.get(sym);
      var cell = row && row.get(cur);

      if (!cell || cell.length === 0) {
        steps.push({ step: step++, stack: stackStr(stack), input: tokens.slice(pos), action: "Error: no rule" });
        return { steps: steps, accepted: false, tree: null };
      }

      var prod = cell[0];
      stack.pop(); // Non-terminal ko expand karne ke liye stack se nikaal diya

      steps.push({ step: step++, stack: stackStr(stack), input: tokens.slice(pos), action: "Expand: " + sym + " \u2192 " + prod.rhs.join(" "), prod: prod });

      if (prod.rhs.length === 1 && prod.rhs[0] === EPSILON) {
        if (node) node.children.push(makeTreeNode(EPSILON, true));
      } else {
        var children = [];

        for (var i = 0; i < prod.rhs.length; i++) {
          var isTerminal = !grammar.nonTerminals.has(prod.rhs[i]);
          children.push(makeTreeNode(prod.rhs[i], isTerminal));
        }

        if (node) {
          for (var i = 0; i < children.length; i++) {
            node.children.push(children[i]);
          }
        }

        // Logic: RHS ko reverse order mein stack mein daalte hain taaki pehla symbol sabse upar rahe
        for (var i = prod.rhs.length - 1; i >= 0; i--) {
          stack.push({ sym: prod.rhs[i], node: children[i] });
        }
      }
    }

    if (step > 600) return { steps: steps, accepted: false, error: "Too many steps", tree: null };
  }

  return { steps: steps, accepted: false, tree: null };
}

function stackStr(stack) {
  // Parsing table UI ke liye stack ke symbols ko string mein convert kar rahe hain
  return stack.map(s => s.sym).join(" ");
}
// update ll1.js

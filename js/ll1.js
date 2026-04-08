function buildLL1Table(grammar, firstSets, followSets) {
  var table = new Map();
  var conflicts = [];

  for (var nt of grammar.nonTerminals) table.set(nt, new Map());

  for (var i = 0; i < grammar.prods.length; i++) {
    var prod = grammar.prods[i];
    var lhs = prod.lhs;
    var rhs = prod.rhs;
    var firstRhs = firstOfSequence(rhs, firstSets);

    for (var t of firstRhs) {
      if (t === EPSILON) continue;
      var row = table.get(lhs);
      if (!row.has(t)) row.set(t, []);
      row.get(t).push(prod);
      if (row.get(t).length > 1) conflicts.push("M[" + lhs + ", " + t + "]");
    }

    if (firstRhs.has(EPSILON)) {
      var follow = followSets.get(lhs) || new Set();
      for (var t of follow) {
        var row = table.get(lhs);
        if (!row.has(t)) row.set(t, []);
        row.get(t).push(prod);
        if (row.get(t).length > 1) conflicts.push("M[" + lhs + ", " + t + "]");
      }
    }
  }

  return { table: table, conflicts: conflicts, isLL1: conflicts.length === 0 };
}

function parseLL1(grammar, table, inputTokens) {
  var tokens = inputTokens.concat([END]);
  var steps = [];

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
      if (cur === END) {
        steps.push({ step: step++, stack: stackStr(stack), input: tokens.slice(pos), action: "Accept" });
        return { steps: steps, accepted: true, tree: root };
      }
      steps.push({ step: step++, stack: stackStr(stack), input: tokens.slice(pos), action: 'Error: extra input "' + cur + '"' });
      return { steps: steps, accepted: false, tree: null };
    }

    if (grammar.terminals.has(sym)) {
      if (sym === cur) {
        steps.push({ step: step++, stack: stackStr(stack), input: tokens.slice(pos), action: 'Match "' + sym + '"' });
        stack.pop();
        pos++;
      } else {
        steps.push({ step: step++, stack: stackStr(stack), input: tokens.slice(pos), action: 'Error: expected "' + sym + '", got "' + cur + '"' });
        return { steps: steps, accepted: false, tree: null };
      }
    } else {
      var row = table.get(sym);
      var cell = row && row.get(cur);
      if (!cell || cell.length === 0) {
        steps.push({ step: step++, stack: stackStr(stack), input: tokens.slice(pos), action: "Error: no rule M[" + sym + ", " + cur + "]" });
        return { steps: steps, accepted: false, tree: null };
      }
      var prod = cell[0];
      stack.pop();

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
  var parts = [];
  for (var i = 0; i < stack.length; i++) {
    parts.push(stack[i].sym);
  }
  return parts.join(" ");
}

function makeTreeNode(label, isTerminal) {
  return { label: label, isTerminal: isTerminal, children: [] };
}

function treeToText(node, prefix, isLast) {
  var connector = isLast ? "\u2514\u2500\u2500 " : "\u251C\u2500\u2500 ";
  var childExt  = isLast ? "    " : "\u2502   ";
  var out = prefix + connector + node.label + "\n";
  for (var i = 0; i < node.children.length; i++) {
    out += treeToText(node.children[i], prefix + childExt, i === node.children.length - 1);
  }
  return out;
}

function parseLR(grammar, action, gotoMap, inputTokens) {
  var tokens = inputTokens.concat([END]);
  var steps = [];
  var stateStack = [0];
  var symStack = [];
  var treeStack = [];
  var pos = 1;
  var step = 1;

  while (true) {
    var currentState = stateStack[stateStack.length - 1];
    var cur = tokens[pos - 1];

    var stateRow = action.get(currentState);
    var cell = stateRow ? stateRow.get(cur) : null;

    var snap = {
      step: step++,
      stateStack: stateStack.slice(),
      symStack: symStack.slice(),
      input: tokens.slice(pos - 1),
    };

    if (!cell || cell.length === 0) {
      snap.action = "Error: no action (state " + currentState + ', "' + cur + '")';
      steps.push(snap);
      return { steps: steps, accepted: false, tree: null };
    }

    var act = cell[0];

    if (act.type === "accept") {
      snap.action = "Accept";
      steps.push(snap);
      return { steps: steps, accepted: true, tree: treeStack[0] || null };
    }

    if (act.type === "shift") {
      snap.action = 'Shift "' + cur + '" \u2192 state ' + act.state;
      steps.push(snap);
      symStack.push(cur);
      stateStack.push(act.state);
      treeStack.push(makeTreeNode(cur, true));
      pos++;
    } else if (act.type === "reduce") {
      var prod = act.prod;
      var len = (prod.rhs.length === 1 && prod.rhs[0] === EPSILON) ? 0 : prod.rhs.length;
      snap.action = "Reduce: " + prod.lhs + " \u2192 " + prod.rhs.join(" ");
      steps.push(snap);

      var children = treeStack.splice(treeStack.length - len);
      symStack.splice(symStack.length - len);
      for (var i = 0; i < len; i++) stateStack.pop();

      var newNode = makeTreeNode(prod.lhs, false);
      newNode.children = children;
      treeStack.push(newNode);
      symStack.push(prod.lhs);

      var topState = stateStack[stateStack.length - 1];
      var gotoRow = gotoMap.get(topState);
      var gotoTarget = gotoRow ? gotoRow.get(prod.lhs) : undefined;

      if (gotoTarget === undefined) {
        steps.push({
          step: step++,
          stateStack: stateStack.slice(),
          symStack: symStack.slice(),
          input: tokens.slice(pos - 1),
          action: "Error: no goto(" + topState + ", " + prod.lhs + ")"
        });
        return { steps: steps, accepted: false, tree: null };
      }
      stateStack.push(gotoTarget);
    }

    if (step > 600) return { steps: steps, accepted: false, error: "Too many steps", tree: null };
  }
}

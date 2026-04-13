// Yeh code Shift-Reduce logic implement karta hai.

function makeTreeNode(label, isTerminal) {
  // Parse tree ka ek single dabba (node) bana rahe hain
  return { label: label, isTerminal: isTerminal, children: [] };
}

function treeToText(node, prefix, isLast) {
  // Tree ko console ya screen pe visual (tree-like) format mein dikhane ke liye helper
  var connector = isLast ? "\u2514\u2500\u2500 " : "\u251C\u2500\u2500 ";
  var childExt  = isLast ? "    " : "\u2502   ";
  var out = prefix + connector + node.label + "\n";
  for (var i = 0; i < node.children.length; i++) {
    out += treeToText(node.children[i], prefix + childExt, i === node.children.length - 1);
  }
  return out;
}

function parseLR(grammar, action, gotoMap, inputTokens) {
  // Input string ke end mein '$' add kar rahe hain acceptance check ke liye
  var tokens = inputTokens.concat([END]);
  var steps = [];
  
  // Stacks setup: states, symbols aur tree nodes track karne ke liye
  var stateStack = [0]; // Hamesha state 0 se shuru karte hain
  var symStack = [];
  var treeStack = [];
  
  var pos = 1; // Input pointer
  var step = 1;

  while (true) {
    var currentState = stateStack[stateStack.length - 1]; // Stack ka sabse upar wala state
    var cur = tokens[pos - 1]; // Current input symbol jo hum read kar rahe hain

    // Table se check karo ki is state aur input ke liye kya action lena hai
    var stateRow = action.get(currentState);
    var cell = stateRow ? stateRow.get(cur) : null;

    // Har step ka snapshot save karo (UI mein table dikhane ke liye)
    var snap = {
      step: step++,
      stateStack: stateStack.slice(),
      symStack: symStack.slice(),
      input: tokens.slice(pos - 1),
    };

    // Agar table mein koi rule nahi mila toh Error (Parsing Fail)
    if (!cell || cell.length === 0) {
      snap.action = "Error: no action (state " + currentState + ', "' + cur + '")';
      steps.push(snap);
      return { steps: steps, accepted: false, tree: null };
    }

    var act = cell[0];

    // Case 1: ACCEPT - Parsing successfully khatam ho gayi
    if (act.type === "accept") {
      snap.action = "Accept";
      steps.push(snap);
      return { steps: steps, accepted: true, tree: treeStack[0] || null };
    }

    // Case 2: SHIFT - Input ko stack mein dalo aur naye state pe jao
    if (act.type === "shift") {
      snap.action = 'Shift "' + cur + '" \u2192 state ' + act.state;
      steps.push(snap);
      
      symStack.push(cur);
      stateStack.push(act.state);
      treeStack.push(makeTreeNode(cur, true)); // Terminal node ko tree mein add karo
      pos++; // Input pointer aage badhao
    } 
    
    // Case 3: REDUCE - Grammer rule use karke symbols ko combine karo
    else if (act.type === "reduce") {
      var prod = act.prod; // Kaunsa production use ho raha hai
      
      // RHS length nikal rahe hain taaki utne symbols stack se pop kar sakein
      var len = (prod.rhs.length === 1 && prod.rhs[0] === EPSILON) ? 0 : prod.rhs.length;
      
      snap.action = "Reduce: " + prod.lhs + " \u2192 " + prod.rhs.join(" ");
      steps.push(snap);

      // Stack se RHS symbols aur states nikal rahe hain
      var children = treeStack.splice(treeStack.length - len);
      symStack.splice(symStack.length - len);
      for (var i = 0; i < len; i++) stateStack.pop();

      // Naya non-terminal node banao aur popped items ko iske children bana do (Bottom-Up Tree)
      var newNode = makeTreeNode(prod.lhs, false);
      newNode.children = children;
      treeStack.push(newNode);
      symStack.push(prod.lhs);

      // Reduce ke baad GOTO table check karna padta hai ki naya state kya hoga
      var topState = stateStack[stateStack.length - 1];
      var gotoRow = gotoMap.get(topState);
      var gotoTarget = gotoRow ? gotoRow.get(prod.lhs) : undefined;

      if (gotoTarget === undefined) {
        // Agar GOTO entry missing hai toh error
        return { steps: steps, accepted: false, tree: null };
      }
      stateStack.push(gotoTarget); // Naya state push karo
    }

    // Infinite loop safeguard
    if (step > 600) return { steps: steps, accepted: false, error: "Too many steps", tree: null };
  }
}
// update lr-parse.js
//lalr(1) 
function lr1ItemKey(item) {
  // Har LR(1) item ke liye unique pehchan (LHS -> RHS @ Dot, Lookahead)
  return item.prod.lhs + "->" + item.prod.rhs.join(" ") + "@" + item.dot + "," + item.lookahead;
}

function lr1Closure(items, grammar, firstSets) {
  var result = new Map();

  // Initial items ko map mein daal rahe hain duplicate check karne ke liye
  for (var i = 0; i < items.length; i++) {
    result.set(lr1ItemKey(items[i]), items[i]);
  }

  var changed = true;
  while (changed) {
    changed = false;
    var current = Array.from(result.values());

    for (var i = 0; i < current.length; i++) {
      var item = current[i];
      var sym = item.prod.rhs[item.dot]; // Dot ke just baad wala symbol

      // Agar dot ke baad Non-terminal hai, toh closure expand hoga
      if (!sym || !grammar.nonTerminals.has(sym)) continue;

      // CORE LOGIC: Beta aur current lookahead ka FIRST nikal kar naya lookahead banta hai
      var beta = item.prod.rhs.slice(item.dot + 1).concat([item.lookahead]);
      var firstBeta = firstOfSequence(beta, firstSets);

      for (var j = 0; j < grammar.prods.length; j++) {
        if (grammar.prods[j].lhs !== sym) {continue;}

        for (var la of firstBeta) {
          if (la === EPSILON) {continue;}

          var ni = { prod: grammar.prods[j], dot: 0, lookahead: la };
          var k = lr1ItemKey(ni);

          // Agar item naya hai, toh add karo aur loop phir se chalao
          if (!result.has(k)) {
            result.set(k, ni);
            changed = true;
          }
        }
      }
    }
  }
  return Array.from(result.values());
}

function lr1Goto(items, sym, grammar, firstSets) {
  var moved = [];
  // Jin items mein dot ke baad 'sym' hai, unka dot aage badhao
  for (var i = 0; i < items.length; i++) {
    if (items[i].prod.rhs[items[i].dot] === sym) {
      moved.push({
        prod: items[i].prod,
        dot: items[i].dot + 1,
        lookahead: items[i].lookahead
      });
    }
  }
  // Nayi position ke baad closure calculate karna zaroori hai
  if (moved.length > 0) {
    return lr1Closure(moved, grammar, firstSets);
  }
  return [];
}

function coreKey(items) {
  var keys = [];
  // LALR merging ke liye lookahead ko ignore karke sirf core production aur dot chahiye
  for (var i = 0; i < items.length; i++) {
    keys.push(items[i].prod.lhs + "->" + items[i].prod.rhs.join(" ") + "@" + items[i].dot);
  }
  return keys.sort().join("|");
}

function buildLALR1Table(grammar) {
  var aug = augment(grammar); // Start symbol S' -> S add karna
  var firstSets = computeFirst(aug);

  var lr1States = [];
  var coreToId = new Map(); // LALR Core tracking (State merging ke liye)
  var keyToId = new Map();  // Exact LR(1) state tracking

  // Initial State I0 generate karo
  var initItems = lr1Closure(
    [{ prod: aug.prods[0], dot: 0, lookahead: END }],
    aug,
    firstSets
  );

  lr1States.push({ id: 0, items: initItems, trans: new Map() });
  coreToId.set(coreKey(initItems), 0);

  var idx = 0;
  // BFS algorithm se saare states dhundo
  while (idx < lr1States.length) {
    var state = lr1States[idx++];
    var syms = new Set();

    // Check karo is state se kaun-kaun se symbols scan ho sakte hain
    for (var i = 0; i < state.items.length; i++) {
      var s = state.items[i].prod.rhs[state.items[i].dot];
      if (s) syms.add(s);
    }

    for (var sym of syms) {
      var gItems = lr1Goto(state.items, sym, aug, firstSets);
      if (gItems.length === 0) continue;

      var fKeys = gItems.map(lr1ItemKey).sort().join("|");
      var core = coreKey(gItems);

      if (keyToId.has(fKey)) {
        // Agar exact same LR(1) state mil gaya
        state.trans.set(sym, keyToId.get(fKey));
      } else if (coreToId.has(core)) {
        // LALR MAGIC: Core same hai par lookahead alag? Merge kar do!
        var existingId = coreToId.get(core);
        state.trans.set(sym, existingId);
        keyToId.set(fKey, existingId);
        // Note: Real LALR mein yahan lookaheads ko merge (union) karna padta hai
      } else {
        // Bilkul naya state mila
        var id = lr1States.length;
        lr1States.push({ id: id, items: gItems, trans: new Map() });
        keyToId.set(fKey, id);
        coreToId.set(core, id);
        state.trans.set(sym, id);
      }
    }
  }

  var action = new Map();
  var gotoMap = new Map();
  var conflicts = [];

  // Table filling: Action (Shift/Reduce/Accept) aur Goto
  for (var i = 0; i < lr1States.length; i++) {
    var state = lr1States[i];

    for (var entry of state.trans) {
      var sym = entry[0], target = entry[1];
      if (aug.terminals.has(sym)) {
        // Terminal symbol par hamesha SHIFT hota hai
        addActionToTable(action, state.id, sym, { type: "shift", state: target }, conflicts);
      } else if (aug.nonTerminals.has(sym)) {
        // Non-terminal symbol par GOTO table update hoti hai
        if (!gotoMap.has(state.id)) gotoMap.set(state.id, new Map());
        gotoMap.get(state.id).set(sym, target);
      }
    }

    for (var j = 0; j < state.items.length; j++) {
      var item = state.items[j];
      if (item.prod.rhs[item.dot]) continue; // Agar dot end mein nahi hai toh skip

      var prod = item.prod;
      if (prod.lhs === aug.start) {
        // Start production dot ke end pe -> Acceptance
        addActionToTable(action, state.id, END, { type: "accept" }, conflicts);
      } else {
        // REDUCE logic: Sirf lookahead wale symbol par hi reduce karenge
        addActionToTable(action, state.id, item.lookahead, { type: "reduce", prod: prod }, conflicts);
      }
    }
  }

  // Final Output clean format mein
  return {
    states: lr1States,
    action: action,
    goto: gotoMap,
    conflicts: conflicts,
    isOk: conflicts.length === 0
  };
}
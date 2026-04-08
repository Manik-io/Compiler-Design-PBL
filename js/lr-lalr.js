function lr1ItemKey(item) {
  return item.prod.lhs + "->" + item.prod.rhs.join(" ") + "@" + item.dot + "," + item.lookahead;
}

function lr1Closure(items, grammar, firstSets) {
  var result = new Map();
  for (var i = 0; i < items.length; i++) result.set(lr1ItemKey(items[i]), items[i]);
  var changed = true;

  while (changed) {
    changed = false;
    var current = Array.from(result.values());
    for (var i = 0; i < current.length; i++) {
      var item = current[i];
      var sym = item.prod.rhs[item.dot];
      if (!sym || !grammar.nonTerminals.has(sym)) continue;

      var beta = item.prod.rhs.slice(item.dot + 1).concat([item.lookahead]);
      var firstBeta = firstOfSequence(beta, firstSets);

      for (var j = 0; j < grammar.prods.length; j++) {
        if (grammar.prods[j].lhs !== sym) continue;
        for (var la of firstBeta) {
          if (la === EPSILON) continue;
          var ni = { prod: grammar.prods[j], dot: 0, lookahead: la };
          var k = lr1ItemKey(ni);
          if (!result.has(k)) { result.set(k, ni); changed = true; }
        }
      }
    }
  }
  return Array.from(result.values());
}

function lr1Goto(items, sym, grammar, firstSets) {
  var moved = [];
  for (var i = 0; i < items.length; i++) {
    if (items[i].prod.rhs[items[i].dot] === sym) {
      moved.push({ prod: items[i].prod, dot: items[i].dot + 1, lookahead: items[i].lookahead });
    }
  }
  if (moved.length > 0) return lr1Closure(moved, grammar, firstSets);
  return [];
}

function coreKey(items) {
  var keys = [];
  for (var i = 0; i < items.length; i++) {
    keys.push(items[i].prod.lhs + "->" + items[i].prod.rhs.join(" ") + "@" + items[i].dot);
  }
  return keys.sort().join("|");
}

function buildLALR1Table(grammar) {
  var aug = augment(grammar);
  var firstSets = computeFirst(aug);

  var lr1States = [];
  var coreToId = new Map();
  var keyToId = new Map();

  var initItems = lr1Closure([{ prod: aug.prods[0], dot: 0, lookahead: END }], aug, firstSets);
  lr1States.push({ id: 0, items: initItems, trans: new Map() });

  var initKeys = [];
  for (var i = 0; i < initItems.length; i++) initKeys.push(lr1ItemKey(initItems[i]));
  coreToId.set(coreKey(initItems), 0);
  keyToId.set(initKeys.sort().join("|"), 0);

  var idx = 0;
  while (idx < lr1States.length) {
    var state = lr1States[idx++];
    var syms = new Set();
    for (var i = 0; i < state.items.length; i++) {
      var s = state.items[i].prod.rhs[state.items[i].dot];
      if (s) syms.add(s);
    }

    for (var sym of syms) {
      var gItems = lr1Goto(state.items, sym, aug, firstSets);
      if (gItems.length === 0) continue;

      var fKeys = [];
      for (var i = 0; i < gItems.length; i++) fKeys.push(lr1ItemKey(gItems[i]));
      var fKey = fKeys.sort().join("|");
      var core = coreKey(gItems);

      if (keyToId.has(fKey)) {
        state.trans.set(sym, keyToId.get(fKey));
      } else if (coreToId.has(core)) {
        var existingId = coreToId.get(core);
        state.trans.set(sym, existingId);
        keyToId.set(fKey, existingId);
      } else {
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

  for (var i = 0; i < lr1States.length; i++) {
    var state = lr1States[i];
    for (var entry of state.trans) {
      var sym = entry[0], target = entry[1];
      if (aug.terminals.has(sym)) {
        addActionToTable(action, state.id, sym, { type: "shift", state: target }, conflicts);
      } else if (aug.nonTerminals.has(sym)) {
        if (!gotoMap.has(state.id)) gotoMap.set(state.id, new Map());
        gotoMap.get(state.id).set(sym, target);
      }
    }
    for (var j = 0; j < state.items.length; j++) {
      var item = state.items[j];
      if (item.prod.rhs[item.dot]) continue;
      var prod = item.prod;
      if (prod.lhs === aug.start) {
        addActionToTable(action, state.id, END, { type: "accept" }, conflicts);
      } else {
        addActionToTable(action, state.id, item.lookahead, { type: "reduce", prod: prod }, conflicts);
      }
    }
  }

  var lrStates = [];
  for (var i = 0; i < lr1States.length; i++) {
    var s = lr1States[i];
    var mapped = [];
    for (var j = 0; j < s.items.length; j++) {
      mapped.push({ prod: s.items[j].prod, dot: s.items[j].dot, lookahead: s.items[j].lookahead });
    }
    lrStates.push({ id: s.id, items: mapped, trans: s.trans });
  }

  return { states: lrStates, action: action, goto: gotoMap, conflicts: conflicts, isOk: conflicts.length === 0 };
}

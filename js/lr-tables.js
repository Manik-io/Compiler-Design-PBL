function buildLR0Table(grammar) {
  var aug = augment(grammar);
  var states = buildLR0States(aug);
  var action = new Map();
  var gotoMap = new Map();
  var conflicts = [];

  for (var i = 0; i < states.length; i++) {
    var state = states[i];

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
      if (dotSym(item) !== null) continue;
      var prod = item.prod;
      if (prod.lhs === aug.start) {
        addActionToTable(action, state.id, END, { type: "accept" }, conflicts);
      } else {
        for (var t of aug.terminals) {
          addActionToTable(action, state.id, t, { type: "reduce", prod: prod }, conflicts);
        }
        addActionToTable(action, state.id, END, { type: "reduce", prod: prod }, conflicts);
      }
    }
  }

  return { states: states, action: action, goto: gotoMap, conflicts: conflicts, isOk: conflicts.length === 0 };
}

function buildSLR1Table(grammar) {
  var aug = augment(grammar);
  var states = buildLR0States(aug);
  var firstSets = computeFirst(aug);
  var followSets = computeFollow(aug, firstSets);
  var action = new Map();
  var gotoMap = new Map();
  var conflicts = [];

  for (var i = 0; i < states.length; i++) {
    var state = states[i];

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
      if (dotSym(item) !== null) continue;
      var prod = item.prod;
      if (prod.lhs === aug.start) {
        addActionToTable(action, state.id, END, { type: "accept" }, conflicts);
      } else {
        var follow = followSets.get(prod.lhs) || new Set();
        for (var t of follow) {
          addActionToTable(action, state.id, t, { type: "reduce", prod: prod }, conflicts);
        }
      }
    }
  }

  return { states: states, action: action, goto: gotoMap, conflicts: conflicts, isOk: conflicts.length === 0 };
}

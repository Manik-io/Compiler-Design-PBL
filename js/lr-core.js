function itemKey(item) {
  // Har item ko ek unique string pehchan de rahe hain (e.g., "E->E+T@1")
  return item.prod.lhs + "->" + item.prod.rhs.join(" ") + "@" + item.dot;
}

function dotSym(item) {
  var rhs = item.prod.rhs;
  if (rhs.length === 1 && rhs[0] === EPSILON) return null;
  // Dot ke just baad wala symbol return karta hai (jise hum scan karne wale hain)
  if (item.dot < rhs.length) return rhs[item.dot];
  return null;
}

function lrClosure(items, grammar) {
  var result = new Map();
  for (var i = 0; i < items.length; i++) {
    result.set(itemKey(items[i]), items[i]);
  }
  var changed = true;
  while (changed) {
    changed = false;
    var current = Array.from(result.values());
    for (var i = 0; i < current.length; i++) {
      var sym = dotSym(current[i]);
      // Agar dot ke baad Non-Terminal hai, toh uske saare productions add karo
      if (!sym || !grammar.nonTerminals.has(sym)) continue;
      for (var j = 0; j < grammar.prods.length; j++) {
        if (grammar.prods[j].lhs !== sym) continue;
        var ni = { prod: grammar.prods[j], dot: 0 }; // Naya item hamesha dot=0 se shuru hoga
        var k = itemKey(ni);
        if (!result.has(k)) { result.set(k, ni); changed = true; }
      }
    }
  }
  return Array.from(result.values());
}

function lrGoto(items, sym, grammar) {
  var moved = [];
  for (var i = 0; i < items.length; i++) {
    // Agar dot ke baad wala symbol 'sym' se match hota hai, toh dot ko ek step aage badhao
    if (dotSym(items[i]) === sym) {
      moved.push({ prod: items[i].prod, dot: items[i].dot + 1 });
    }
  }
  // Dot aage badhane ke baad closure lena zaroori hai
  if (moved.length > 0) return lrClosure(moved, grammar);
  return [];
}

function stateSetKey(items) {
  // Poore state (group of items) ko ek unique key dena taaki duplicates na banein
  var keys = [];
  for (var i = 0; i < items.length; i++) keys.push(itemKey(items[i]));
  return keys.sort().join("|");
}

function buildLR0States(augGrammar) {
  var states = [];
  var keyToId = new Map();

  // State 0: Augmented production ka closure lekar shuruat karte hain
  var initItems = lrClosure([{ prod: augGrammar.prods[0], dot: 0 }], augGrammar);
  states.push({ id: 0, items: initItems, trans: new Map() });
  keyToId.set(stateSetKey(initItems), 0);

  var i = 0;
  while (i < states.length) {
    var state = states[i++];
    var syms = new Set();
    // Pata lagao is state se kaun-kaun se symbols scan ho sakte hain
    for (var j = 0; j < state.items.length; j++) {
      var s = dotSym(state.items[j]);
      if (s !== null) syms.add(s);
    }
    for (var sym of syms) {
      var gItems = lrGoto(state.items, sym, augGrammar);
      if (gItems.length === 0) continue;
      var gKey = stateSetKey(gItems);
      // Agar ye naya state hai, toh states array mein add karo
      if (!keyToId.has(gKey)) {
        var id = states.length;
        states.push({ id: id, items: gItems, trans: new Map() });
        keyToId.set(gKey, id);
      }
      // Current state se symbol 'sym' par kahan jaana hai (Transition)
      state.trans.set(sym, keyToId.get(gKey));
    }
  }
  return states;
}

function augment(grammar) {
  // Grammar ko augment kar rahe hain (e.g., S' -> S) taaki acceptance condition clear ho
  var augStart = grammar.start + "'";
  var augProd = { lhs: augStart, rhs: [grammar.start] };
  return buildGrammar([augProd].concat(grammar.prods), augStart);
}

function addActionToTable(actionMap, sid, sym, entry, conflicts) {
  if (!actionMap.has(sid)) actionMap.set(sid, new Map());
  var row = actionMap.get(sid);
  if (!row.has(sym)) row.set(sym, []);
  var cell = row.get(sym);
  
  var isDuplicate = false;
  for (var i = 0; i < cell.length; i++) {
    if (JSON.stringify(cell[i]) === JSON.stringify(entry)) { isDuplicate = true; break; }
  }

  if (!isDuplicate) {
    cell.push(entry);
    // Agar ek cell mein 1 se zyada entry (Shift/Reduce ya Reduce/Reduce) toh Conflict!
    if (cell.length > 1) conflicts.push("State " + sid + ', "' + sym + '"');
  }
}
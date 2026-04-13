//LR(0) Table Builder

function buildLR0Table(grammar) {
  var aug = augment(grammar); // Grammar ko badhao (S' -> S) taaki acceptance clear ho
  var states = buildLR0States(aug); // DFA States build karo
  var action = new Map();
  var gotoMap = new Map();
  var conflicts = [];

  for (var i = 0; i < states.length; i++) {
    var state = states[i];

    // Har state ke transitions check karo (Transitions = Shift ya Goto)
    for (var entry of state.trans) {
      var sym = entry[0], target = entry[1];
      
      // Agar symbol Terminal hai toh 'Shift' action add karo
      if (aug.terminals.has(sym)) {
        addActionToTable(action, state.id, sym, { type: "shift", state: target }, conflicts);
      } 
      // Agar symbol Non-Terminal hai toh 'Goto' table mein entry dalo
      else if (aug.nonTerminals.has(sym)) {
        if (!gotoMap.has(state.id)) gotoMap.set(state.id, new Map());
        gotoMap.get(state.id).set(sym, target);
      }
    }

    // Check karo ki kya koi production complete ho gaya hai (Dot end mein hai)
    for (var j = 0; j < state.items.length; j++) {
      var item = state.items[j];
      if (dotSym(item) !== null) continue; // Agar dot ke baad kuch bacha hai, toh skip
      
      var prod = item.prod;
      
      // Agar Augmented Start symbol complete hua toh 'Accept' dalo
      if (prod.lhs === aug.start) {
        addActionToTable(action, state.id, END, { type: "accept" }, conflicts);
      } else {
        // LR(0) Blind Reduction: Saare terminals ke liye Reduce action dalo
        // Yeh LR(0) ki sabse badi weakness hai (bahut conflicts aate hain)
        for (var t of aug.terminals) {
          addActionToTable(action, state.id, t, { type: "reduce", prod: prod }, conflicts);
        }
        addActionToTable(action, state.id, END, { type: "reduce", prod: prod }, conflicts);
      }
    }
  }

  return { states: states, action: action, goto: gotoMap, conflicts: conflicts, isOk: conflicts.length === 0 };
}

 // SLR(1) Table Builder

function buildSLR1Table(grammar) {
  var aug = augment(grammar);
  var states = buildLR0States(aug); // SLR bhi LR(0) waale states hi use karta hai
  var firstSets = computeFirst(aug);
  var followSets = computeFollow(aug, firstSets); // FOLLOW set calculate karo
  
  var action = new Map();
  var gotoMap = new Map();
  var conflicts = [];

  for (var i = 0; i < states.length; i++) {
    var state = states[i];

    // Shift aur Goto logic same rehta hai
    for (var entry of state.trans) {
      var sym = entry[0], target = entry[1];
      if (aug.terminals.has(sym)) {
        addActionToTable(action, state.id, sym, { type: "shift", state: target }, conflicts);
      } else if (aug.nonTerminals.has(sym)) {
        if (!gotoMap.has(state.id)) gotoMap.set(state.id, new Map());
        gotoMap.get(state.id).set(sym, target);
      }
    }

    // Reduction Logic (Different from LR0)
    for (var j = 0; j < state.items.length; j++) {
      var item = state.items[j];
      if (dotSym(item) !== null) continue; 
      
      var prod = item.prod;
      if (prod.lhs === aug.start) {
        addActionToTable(action, state.id, END, { type: "accept" }, conflicts);
      } else {
        // SLR(1) Smart Reduction: Sirf un symbols pe reduce karo jo FOLLOW(LHS) mein hain
        // Isse faltu ke Shift-Reduce conflicts avoid ho jaate hain
        var follow = followSets.get(prod.lhs) || new Set();
        for (var t of follow) {
          addActionToTable(action, state.id, t, { type: "reduce", prod: prod }, conflicts);
        }
      }
    }
  }

  return { states: states, action: action, goto: gotoMap, conflicts: conflicts, isOk: conflicts.length === 0 };
}

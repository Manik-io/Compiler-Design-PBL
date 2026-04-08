function computeFirst(grammar) {
  var first = new Map();

  for (var t of grammar.terminals) first.set(t, new Set([t]));
  first.set(EPSILON, new Set([EPSILON]));
  for (var nt of grammar.nonTerminals) first.set(nt, new Set());

  var changed = true;
  while (changed) {
    changed = false;
    for (var p = 0; p < grammar.prods.length; p++) {
      var lhs = grammar.prods[p].lhs;
      var rhs = grammar.prods[p].rhs;
      var before = first.get(lhs).size;

      if (rhs.length === 1 && rhs[0] === EPSILON) {
        first.get(lhs).add(EPSILON);
      } else {
        var allNullable = true;
        for (var i = 0; i < rhs.length; i++) {
          var sf = first.get(rhs[i]) || new Set([rhs[i]]);
          for (var f of sf) {
            if (f !== EPSILON) first.get(lhs).add(f);
          }
          if (!sf.has(EPSILON)) { allNullable = false; break; }
        }
        if (allNullable) first.get(lhs).add(EPSILON);
      }

      if (first.get(lhs).size > before) changed = true;
    }
  }
  return first;
}

function computeFollow(grammar, firstSets) {
  var follow = new Map();
  for (var nt of grammar.nonTerminals) follow.set(nt, new Set());
  follow.get(grammar.start).add(END);

  var changed = true;
  while (changed) {
    changed = false;
    for (var p = 0; p < grammar.prods.length; p++) {
      var lhs = grammar.prods[p].lhs;
      var rhs = grammar.prods[p].rhs;

      for (var i = 0; i < rhs.length; i++) {
        var sym = rhs[i];
        if (!grammar.nonTerminals.has(sym)) continue;
        var before = follow.get(sym).size;

        var beta = rhs.slice(i + 1);
        if (beta.length === 0) {
          for (var f of follow.get(lhs)) follow.get(sym).add(f);
        } else {
          var allNullable = true;
          for (var k = 0; k < beta.length; k++) {
            var sf = firstSets.get(beta[k]) || new Set([beta[k]]);
            for (var f of sf) {
              if (f !== EPSILON) follow.get(sym).add(f);
            }
            if (!sf.has(EPSILON)) { allNullable = false; break; }
          }
          if (allNullable) {
            for (var f of follow.get(lhs)) follow.get(sym).add(f);
          }
        }

        if (follow.get(sym).size > before) changed = true;
      }
    }
  }
  return follow;
}

function firstOfSequence(syms, firstSets) {
  var result = new Set();
  if (syms.length === 0 || (syms.length === 1 && syms[0] === EPSILON)) {
    result.add(EPSILON);
    return result;
  }
  var allNullable = true;
  for (var i = 0; i < syms.length; i++) {
    var sf = firstSets.get(syms[i]) || new Set([syms[i]]);
    for (var f of sf) {
      if (f !== EPSILON) result.add(f);
    }
    if (!sf.has(EPSILON)) { allNullable = false; break; }
  }
  if (allNullable) result.add(EPSILON);
  return result;
}

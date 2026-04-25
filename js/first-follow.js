/**
 * computeFirst: FIRST sets nikalne ka logic.
 * FIRST(A) batata hai ki variable 'A' se shuru hone wali strings 
 * kin-kin terminals se start ho sakti hain.
 */
function computeFirst(grammar) {
  var first = new Map();

  // Step 1: Terminals ka FIRST set wo khud hi hote hain
  for (var t of grammar.terminals) first.set(t, new Set([t]));
  first.set(EPSILON, new Set([EPSILON]));
  for (var nt of grammar.nonTerminals) first.set(nt, new Set());

  var changed = true;
  while (changed) {
    changed = false;
    for (var p = 0; p < grammar.prods.length; p++) {
      var lhs = grammar.prods[p].lhs; // Variable (Left Side)
      var rhs = grammar.prods[p].rhs; // Rule (Right Side)
      var before = first.get(lhs).size;

      // Case: Agar production 'A -> ε' hai, toh FIRST(A) mein ε add karo
      if (rhs.length === 1 && rhs[0] === EPSILON) {
        first.get(lhs).add(EPSILON);
      } else {
        var allNullable = true;
        // RHS ke symbols ko ek-ek karke scan karo
        for (var i = 0; i < rhs.length; i++) {
          var sf = first.get(rhs[i]) || new Set([rhs[i]]);
          for (var f of sf) {
            // ε ko chhod kar baki saare terminals add karo
            if (f !== EPSILON) first.get(lhs).add(f);
          }
          // Agar current symbol se ε nahi aa sakta, toh aage ke symbols check mat karo
          if (!sf.has(EPSILON)) { allNullable = false; break; }
        }
        // Agar poora RHS 'nullable' hai, toh FIRST(LHS) mein bhi ε aayega
        if (allNullable) first.get(lhs).add(EPSILON);
      }

      // Agar kisi set ka size bada, matlab humein ek aur iteration chahiye (Fixed Point)
      if (first.get(lhs).size > before) changed = true;
    }
  }
  return first;
}

/**
 * computeFollow: FOLLOW sets nikalne ka logic.
 * FOLLOW(A) batata hai ki variable 'A' ke turant baad kaunse terminals aa sakte hain.
 */
function computeFollow(grammar, firstSets) {
  var follow = new Map();
  for (var nt of grammar.nonTerminals) follow.set(nt, new Set());
  
  // Rule 1: Start symbol ke FOLLOW mein hamesha '$' (END) hota hai
  follow.get(grammar.start).add(END);

  var changed = true;
  while (changed) {
    changed = false;
    for (var p = 0; p < grammar.prods.length; p++) {
      var lhs = grammar.prods[p].lhs;
      var rhs = grammar.prods[p].rhs;

      for (var i = 0; i < rhs.length; i++) {
        var sym = rhs[i];
        // FOLLOW sirf Non-Terminals (Variables) ka nikala jata hai
        if (!grammar.nonTerminals.has(sym)) continue;
        var before = follow.get(sym).size;

        var beta = rhs.slice(i + 1); // 'sym' ke baad wala hissa
        
        // Case: Agar 'sym' rule ka aakhri symbol hai (A -> alpha B)
        if (beta.length === 0) {
          // Jo FOLLOW(A) mein hai, wo FOLLOW(B) mein bhi jayega
          for (var f of follow.get(lhs)) follow.get(sym).add(f);
        } else {
          var allNullable = true;
          // Case: A -> alpha B beta
          // FOLLOW(B) mein FIRST(beta) ke terminals aayenge
          for (var k = 0; k < beta.length; k++) {
            var sf = firstSets.get(beta[k]) || new Set([beta[k]]);
            for (var f of sf) {
              if (f !== EPSILON) follow.get(sym).add(f);
            }
            if (!sf.has(EPSILON)) { allNullable = false; break; }
          }
          // Agar beta poora gayab ho sakta hai (nullable), toh FOLLOW(A) bhi add karo
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

/**
 * firstOfSequence: Poori string (sequence of symbols) ka FIRST nikalne ke liye.
 * Tables build karte waqt iski zaroorat padti hai.
 */
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
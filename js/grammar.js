// =====================================================================
// GRAMMAR PARSER - Context Free Grammar ke liye tools
// =====================================================================

function parseGrammar(text) {
  var lines = text.split("\n");
  var cleaned = [];

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    // Khali lines aur "//" se shuru hone wali comment lines skip karo
    if (line && !line.startsWith("//")) {
      cleaned.push(line);
    }
  }

  if (cleaned.length === 0) return { error: "Grammar is empty." };

  var prods = [];
  var nonTerminals = new Set(); // Set use kiya kyunki duplicates nahi chahiye

  for (var i = 0; i < cleaned.length; i++) {
    var line = cleaned[i];

    // Regex se check karo ki line "A -> alpha" format mein hai ya nahi
    // [A-Za-z][A-Za-z0-9']* = Non-terminal ka naam (capital/small letters, digits, apostrophe allowed)
    // -> ya → (Unicode arrow) dono accept karta hai
    var m = line.match(/^([A-Za-z][A-Za-z0-9']*)\s*(?:->|\u2192)\s*(.+)$/);
    if (!m) return { error: 'Bad production: "' + line + '". Use format: A -> α | β' };

    var lhs = m[1]; // Left Hand Side = Non-terminal (e.g. "S", "E", "A")
    nonTerminals.add(lhs);

    // "|" se split karo — ek hi non-terminal ke multiple alternatives ho sakte hain
    // Jaise: S -> a B | b A — iska matlab 2 productions hain
    var alternatives = m[2].split("|");
    for (var j = 0; j < alternatives.length; j++) {
      var alt = alternatives[j].trim();
      if (!alt) continue;
      // Space se split karke individual symbols nikalo (terminals + non-terminals)
      var symbols = alt.split(/\s+/).filter(function(s) { return s; });
      prods.push({ lhs: lhs, rhs: symbols });
    }
  }

  // Terminal symbols woh hain jo kisi production ke LHS mein nahi aate
  // aur epsilon bhi nahi hain — jaise 'a', 'b', '+', '(' etc.
  var terminals = new Set();
  for (var i = 0; i < prods.length; i++) {
    for (var j = 0; j < prods[i].rhs.length; j++) {
      var sym = prods[i].rhs[j];
      if (!nonTerminals.has(sym) && sym !== EPSILON) {
        terminals.add(sym);
      }
    }
  }

  // Pehli production ka LHS = Start Symbol (convention hai grammar mein)
  return { grammar: { prods: prods, nonTerminals: nonTerminals, terminals: terminals, start: prods[0].lhs } };
}

// =====================================================================
// LEFT RECURSION CHECK
// A → A α jaisi production = Direct Left Recursion (parser loop mein phans jata hai)
// A → B α, B → A β jaisi chain = Indirect Left Recursion
// =====================================================================

function checkLeftRecursion(grammar) {
  var issues = [];
  for (var nt of grammar.nonTerminals) {
    var hasDirect = false;

    // Agar production ka pehla symbol khud wahi non-terminal hai → direct left recursion
    for (var i = 0; i < grammar.prods.length; i++) {
      if (grammar.prods[i].lhs === nt && grammar.prods[i].rhs[0] === nt) {
        hasDirect = true;
        break;
      }
    }

    if (hasDirect) {
      issues.push("Direct left recursion: " + nt + " → " + nt + " ...");
    } else if (hasIndirectLeftRecursion(grammar, nt)) {
      issues.push("Indirect left recursion involving: " + nt);
    }
  }
  return issues;
}

function hasIndirectLeftRecursion(grammar, target) {
  // BFS (Breadth First Search) use karke check karte hain ki
  // koi chain hai jo wapas 'target' non-terminal tak pahunch jaye
  var visited = new Set([target]);
  var queue = [target];

  while (queue.length > 0) {
    var current = queue.shift(); // Queue se pehla element nikalte hain (FIFO)

    for (var i = 0; i < grammar.prods.length; i++) {
      var p = grammar.prods[i];
      if (p.lhs !== current) continue;

      var first = p.rhs[0]; // Production ke RHS ka pehla symbol
      if (!first || first === EPSILON) continue; // Epsilon hai toh skip

      // Agar pehla symbol 'target' hai aur hum khud 'target' nahi hain → indirect recursion mili!
      if (first === target && current !== target) return true;

      // Agar pehla symbol ek non-terminal hai jo abhi visit nahi kiya → queue mein daalo
      if (grammar.nonTerminals.has(first) && !visited.has(first)) {
        visited.add(first);
        queue.push(first);
      }
    }
  }
  return false;
}

// =====================================================================
// LEFT FACTORING CHECK
// Jab ek non-terminal ke 2+ productions same symbol se start karein
// jaise: A → a b | a c — dono 'a' se shuru hote hain, parser confuse ho jata hai
// =====================================================================

function checkLeftFactoring(grammar) {
  var issues = [];
  for (var nt of grammar.nonTerminals) {
    var starts = {}; // Har non-terminal ke productions kisse shuru hote hain, count karo

    for (var i = 0; i < grammar.prods.length; i++) {
      if (grammar.prods[i].lhs !== nt) continue;
      var s = grammar.prods[i].rhs[0] || EPSILON; // Pehla symbol (ya epsilon agar khaali hai)
      starts[s] = (starts[s] || 0) + 1; // Us symbol ka count badhao
    }

    var keys = Object.keys(starts);
    for (var i = 0; i < keys.length; i++) {
      // Agar ek symbol se 2 ya zyada productions start ho rahi hain → left factoring chahiye
      if (starts[keys[i]] > 1) {
        issues.push(nt + ": " + starts[keys[i]] + ' productions start with "' + keys[i] + '"');
      }
    }
  }
  return issues;
}

// =====================================================================
// AMBIGUITY CHECK — FIRST/FIRST aur FIRST/FOLLOW conflicts
//
// FIRST/FIRST conflict: Ek non-terminal ke 2 productions ka FIRST set overlap kare
//   → Parser decide nahi kar sakta kaun si production choose kare
//
// FIRST/FOLLOW conflict: Kisi production mein epsilon ho aur us non-terminal ka
//   FOLLOW set FIRST set se overlap kare
//   → Parser confuse ho jata hai ki epsilon lena hai ya nahi
// =====================================================================

function checkAmbiguity(grammar, firstSets, followSets) {
  var issues = [];
  for (var nt of grammar.nonTerminals) {
    var ntProds = grammar.prods.filter(function(p) { return p.lhs === nt; });
    if (ntProds.length < 2) continue; // 2 se kam productions → conflict possible nahi

    // Har production ke liye uska FIRST set nikalo
    var prodFirsts = [];
    for (var i = 0; i < ntProds.length; i++) {
      prodFirsts.push(firstOfSequence(ntProds[i].rhs, firstSets));
    }

    // Har pair of productions ke beech FIRST sets ka overlap check karo
    for (var i = 0; i < prodFirsts.length; i++) {
      for (var j = i + 1; j < prodFirsts.length; j++) {
        var overlap = [];
        for (var s of prodFirsts[i]) {
          // Epsilon ko ignore karo, sirf real terminals check karo
          if (s !== EPSILON && prodFirsts[j].has(s)) overlap.push(s);
        }
        if (overlap.length > 0) {
          issues.push("FIRST/FIRST conflict in " + nt + ": {" + overlap.join(", ") + "} appears in multiple productions");
        }
      }
    }

    // Agar kisi production ka FIRST set mein epsilon hai → FIRST/FOLLOW conflict check karo
    for (var i = 0; i < prodFirsts.length; i++) {
      if (prodFirsts[i].has(EPSILON)) {
        var follow = followSets.get(nt) || new Set();
        // Epsilon chhod ke baaki symbols
        var nonEps = [];
        for (var s of prodFirsts[i]) {
          if (s !== EPSILON) nonEps.push(s);
        }
        // Agar FIRST ka koi symbol FOLLOW mein bhi hai → conflict!
        var clash = nonEps.filter(function(s) { return follow.has(s); });
        if (clash.length > 0) {
          issues.push("FIRST/FOLLOW conflict in " + nt + ": {" + clash.join(", ") + "} in both FIRST and FOLLOW");
        }
      }
    }
  }
  return issues;
}

// =====================================================================
// LEFT RECURSION REMOVAL — Standard Algorithm (Textbook se)
//
// Direct left recursion ke liye:
//   A → A α | β
//   banta hai:
//   A  → β A'
//   A' → α A' | ε
//
// Indirect left recursion ke liye pehle substitution karke direct banate hain
// =====================================================================

function removeLeftRecursion(grammar) {
  var prods = grammar.prods.slice(); // Original ko preserve karne ke liye copy
  var nts = Array.from(grammar.nonTerminals); // Non-terminals ka ordered array

  for (var i = 0; i < nts.length; i++) {
    var Ai = nts[i];

    // Step 1: Pehle wale non-terminals (Aj, j < i) ko substitute karo
    // Yeh indirect left recursion ko direct mein convert karta hai
    for (var j = 0; j < i; j++) {
      var Aj = nts[j];
      var AjProds = prods.filter(function(p) { return p.lhs === Aj; });

      // Woh productions jahan Ai → Aj ... (Aj pehle aata hai)
      var toReplace = prods.filter(function(p) { return p.lhs === Ai && p.rhs[0] === Aj; });

      for (var k = 0; k < toReplace.length; k++) {
        var prod = toReplace[k];
        prods = prods.filter(function(p) { return p !== prod; }); // Purani production hatao

        var gamma = prod.rhs.slice(1); // Aj ke baad ka hissa (γ)

        // Aj ki har production (δ) ke saath Ai → δ γ bana do
        for (var m = 0; m < AjProds.length; m++) {
          var newRhs;
          if (AjProds[m].rhs[0] === EPSILON) {
            newRhs = gamma.slice(); // Aj → ε tha toh sirf γ bachta hai
          } else {
            newRhs = AjProds[m].rhs.concat(gamma); // Ai → δ γ
          }
          if (newRhs.length === 0) newRhs = [EPSILON];
          prods.push({ lhs: Ai, rhs: newRhs });
        }
      }
    }

    // Step 2: Ab Ai ki direct left recursion hatao
    // recursive = Ai → Ai α wali productions (left recursive)
    // nonRecursive = Ai → β wali productions (normal)
    var recursive = prods.filter(function(p) { return p.lhs === Ai && p.rhs[0] === Ai; });
    var nonRecursive = prods.filter(function(p) { return p.lhs === Ai && p.rhs[0] !== Ai; });
    if (recursive.length === 0) continue; // Koi recursion nahi → skip

    prods = prods.filter(function(p) { return p.lhs !== Ai; }); // Ai ki saari purani productions hatao

    // Naya non-terminal banao: A' (Ai + apostrophe)
    var prime = Ai + "'";

    // Ai → β A' (har non-recursive production ke baad A' attach karo)
    for (var k = 0; k < nonRecursive.length; k++) {
      var rhs;
      if (nonRecursive[k].rhs[0] === EPSILON) {
        rhs = [prime]; // Ai → ε tha toh Ai → A'
      } else {
        rhs = nonRecursive[k].rhs.concat([prime]); // Ai → β A'
      }
      prods.push({ lhs: Ai, rhs: rhs });
    }

    // Agar koi non-recursive production hi nahi thi → Ai → A' (corner case)
    if (nonRecursive.length === 0) prods.push({ lhs: Ai, rhs: [prime] });

    // A' → α A' (recursive part: har Ai → Ai α se A' → α A' banta hai)
    for (var k = 0; k < recursive.length; k++) {
      var alpha = recursive[k].rhs.slice(1); // Ai ke baad wala hissa (α)
      var rhs = alpha.length > 0 ? alpha.concat([prime]) : [prime];
      prods.push({ lhs: prime, rhs: rhs });
    }

    // A' → ε (epsilon production zaroori hai taaki chain khatam ho sake)
    prods.push({ lhs: prime, rhs: [EPSILON] });
  }

  return buildGrammar(prods, grammar.start);
}

// =====================================================================
// LEFT FACTORING — Common prefix nikaalke naya non-terminal banao
//
// Jaise: A → a b c | a b d
//   Common prefix = "a b"
//   banta hai:
//   A  → a b A'
//   A' → c | d
// =====================================================================

function applyLeftFactoring(grammar) {
  var prods = grammar.prods.slice();
  var changed = true;

  // Jab tak koi change ho, tab tak loop chalao (ek baar mein sirf ek factoring karte hain)
  while (changed) {
    changed = false;
    var allNts = Array.from(new Set(prods.map(function(p) { return p.lhs; })));

    for (var n = 0; n < allNts.length; n++) {
      var nt = allNts[n];
      var ntProds = prods.filter(function(p) { return p.lhs === nt; });

      // Sabse lamba common prefix dhundho
      var prefix = longestCommonPrefix(ntProds);
      if (prefix.length === 0) continue; // Koi common prefix nahi → skip

      // Prefix se match karne wali aur na match karne wali productions alag karo
      var matching = ntProds.filter(function(p) { return arrStartsWith(p.rhs, prefix); });
      var notMatching = ntProds.filter(function(p) { return !arrStartsWith(p.rhs, prefix); });
      if (matching.length < 2) continue; // Sirf ek production → factoring ki zaroorat nahi

      // Naye non-terminal ka naam banao (A', A'', etc. — jab tak unique na mile)
      var existingNames = new Set(prods.map(function(p) { return p.lhs; }));
      var prime = nt + "'";
      while (existingNames.has(prime)) prime += "'"; // Agar A' pehle se hai toh A'' banao

      // Purani productions hatao
      prods = prods.filter(function(p) { return p.lhs !== nt; });

      // A → prefix A' (common prefix ek jagah, baaki A' mein)
      prods.push({ lhs: nt, rhs: prefix.concat([prime]) });

      // Jo match nahi karti woh productions waise hi raho
      for (var k = 0; k < notMatching.length; k++) {
        prods.push(notMatching[k]);
      }

      // A' → (prefix ke baad ka hissa) — har matching production ke liye
      for (var k = 0; k < matching.length; k++) {
        var rest = matching[k].rhs.slice(prefix.length); // Prefix hataao, baaki lo
        prods.push({ lhs: prime, rhs: rest.length > 0 ? rest : [EPSILON] }); // Khaali hua toh epsilon
      }

      changed = true;
      break; // Ek baar mein ek hi factoring karo, phir dohrao
    }
  }

  return buildGrammar(prods, grammar.start);
}

// =====================================================================
// HELPER FUNCTIONS
// =====================================================================

// Saari productions mein se sabse lamba common prefix dhundho (pair-wise comparison)
function longestCommonPrefix(prods) {
  var best = [];
  for (var i = 0; i < prods.length; i++) {
    for (var j = i + 1; j < prods.length; j++) {
      var cp = commonPrefixArr(prods[i].rhs, prods[j].rhs);
      if (cp.length > best.length) best = cp; // Jo bhi lamba prefix mile, usse rakh lo
    }
  }
  return best;
}

// Do symbol arrays ka common prefix nikaalo (jaise "hello" aur "help" → "hel")
function commonPrefixArr(a, b) {
  var r = [];
  var len = Math.min(a.length, b.length); // Chhote array tak hi compare karo
  for (var i = 0; i < len; i++) {
    if (a[i] === b[i]) r.push(a[i]);
    else break; // Pehla mismatch milte hi rok do
  }
  return r;
}

// Check karo ki array 'arr', prefix se shuru hota hai ya nahi
function arrStartsWith(arr, prefix) {
  for (var i = 0; i < prefix.length; i++) {
    if (arr[i] !== prefix[i]) return false;
  }
  return true;
}

// Productions se naya grammar object banao (non-terminals aur terminals dono recalculate)
function buildGrammar(prods, startSymbol) {
  // LHS mein jo bhi hain woh non-terminals hain
  var nonTerminals = new Set(prods.map(function(p) { return p.lhs; }));
  var terminals = new Set();

  // RHS mein jo non-terminal ya epsilon nahi hain woh terminals hain
  for (var i = 0; i < prods.length; i++) {
    for (var j = 0; j < prods[i].rhs.length; j++) {
      var sym = prods[i].rhs[j];
      if (!nonTerminals.has(sym) && sym !== EPSILON) terminals.add(sym);
    }
  }

  return { prods: prods, nonTerminals: nonTerminals, terminals: terminals, start: startSymbol };
}
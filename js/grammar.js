function parseGrammar(text) {
  var lines = text.split("\n");
  var cleaned = [];
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (line && !line.startsWith("//")) {
      cleaned.push(line);
    }
  }
  if (cleaned.length === 0) return { error: "Grammar is empty." };

  var prods = [];
  var nonTerminals = new Set();

  for (var i = 0; i < cleaned.length; i++) {
    var line = cleaned[i];
    var m = line.match(/^([A-Za-z][A-Za-z0-9']*)\s*(?:->|\u2192)\s*(.+)$/);
    if (!m) return { error: 'Bad production: "' + line + '". Use format: A -> \u03b1 | \u03b2' };

    var lhs = m[1];
    nonTerminals.add(lhs);

    var alternatives = m[2].split("|");
    for (var j = 0; j < alternatives.length; j++) {
      var alt = alternatives[j].trim();
      if (!alt) continue;
      var symbols = alt.split(/\s+/).filter(function(s) { return s; });
      prods.push({ lhs: lhs, rhs: symbols });
    }
  }

  var terminals = new Set();
  for (var i = 0; i < prods.length; i++) {
    for (var j = 0; j < prods[i].rhs.length; j++) {
      var sym = prods[i].rhs[j];
      if (!nonTerminals.has(sym) && sym !== EPSILON) {
        terminals.add(sym);
      }
    }
  }

  return { grammar: { prods: prods, nonTerminals: nonTerminals, terminals: terminals, start: prods[0].lhs } };
}

function checkLeftRecursion(grammar) {
  var issues = [];
  for (var nt of grammar.nonTerminals) {
    var hasDirect = false;
    for (var i = 0; i < grammar.prods.length; i++) {
      if (grammar.prods[i].lhs === nt && grammar.prods[i].rhs[0] === nt) {
        hasDirect = true;
        break;
      }
    }
    if (hasDirect) {
      issues.push("Direct left recursion: " + nt + " \u2192 " + nt + " ...");
    } else if (hasIndirectLeftRecursion(grammar, nt)) {
      issues.push("Indirect left recursion involving: " + nt);
    }
  }
  return issues;
}

function hasIndirectLeftRecursion(grammar, target) {
  var visited = new Set([target]);
  var queue = [target];
  while (queue.length > 0) {
    var current = queue.shift();
    for (var i = 0; i < grammar.prods.length; i++) {
      var p = grammar.prods[i];
      if (p.lhs !== current) continue;
      var first = p.rhs[0];
      if (!first || first === EPSILON) continue;
      if (first === target && current !== target) return true;
      if (grammar.nonTerminals.has(first) && !visited.has(first)) {
        visited.add(first);
        queue.push(first);
      }
    }
  }
  return false;
}

function checkLeftFactoring(grammar) {
  var issues = [];
  for (var nt of grammar.nonTerminals) {
    var starts = {};
    for (var i = 0; i < grammar.prods.length; i++) {
      if (grammar.prods[i].lhs !== nt) continue;
      var s = grammar.prods[i].rhs[0] || EPSILON;
      starts[s] = (starts[s] || 0) + 1;
    }
    var keys = Object.keys(starts);
    for (var i = 0; i < keys.length; i++) {
      if (starts[keys[i]] > 1) {
        issues.push(nt + ": " + starts[keys[i]] + ' productions start with "' + keys[i] + '"');
      }
    }
  }
  return issues;
}

function checkAmbiguity(grammar, firstSets, followSets) {
  var issues = [];
  for (var nt of grammar.nonTerminals) {
    var ntProds = grammar.prods.filter(function(p) { return p.lhs === nt; });
    if (ntProds.length < 2) continue;

    var prodFirsts = [];
    for (var i = 0; i < ntProds.length; i++) {
      prodFirsts.push(firstOfSequence(ntProds[i].rhs, firstSets));
    }

    for (var i = 0; i < prodFirsts.length; i++) {
      for (var j = i + 1; j < prodFirsts.length; j++) {
        var overlap = [];
        for (var s of prodFirsts[i]) {
          if (s !== EPSILON && prodFirsts[j].has(s)) overlap.push(s);
        }
        if (overlap.length > 0) {
          issues.push("FIRST/FIRST conflict in " + nt + ": {" + overlap.join(", ") + "} appears in multiple productions");
        }
      }
    }

    for (var i = 0; i < prodFirsts.length; i++) {
      if (prodFirsts[i].has(EPSILON)) {
        var follow = followSets.get(nt) || new Set();
        var nonEps = [];
        for (var s of prodFirsts[i]) {
          if (s !== EPSILON) nonEps.push(s);
        }
        var clash = nonEps.filter(function(s) { return follow.has(s); });
        if (clash.length > 0) {
          issues.push("FIRST/FOLLOW conflict in " + nt + ": {" + clash.join(", ") + "} in both FIRST and FOLLOW");
        }
      }
    }
  }
  return issues;
}

function removeLeftRecursion(grammar) {
  var prods = grammar.prods.slice();
  var nts = Array.from(grammar.nonTerminals);

  for (var i = 0; i < nts.length; i++) {
    var Ai = nts[i];
    for (var j = 0; j < i; j++) {
      var Aj = nts[j];
      var AjProds = prods.filter(function(p) { return p.lhs === Aj; });
      var toReplace = prods.filter(function(p) { return p.lhs === Ai && p.rhs[0] === Aj; });
      for (var k = 0; k < toReplace.length; k++) {
        var prod = toReplace[k];
        prods = prods.filter(function(p) { return p !== prod; });
        var gamma = prod.rhs.slice(1);
        for (var m = 0; m < AjProds.length; m++) {
          var newRhs;
          if (AjProds[m].rhs[0] === EPSILON) {
            newRhs = gamma.slice();
          } else {
            newRhs = AjProds[m].rhs.concat(gamma);
          }
          if (newRhs.length === 0) newRhs = [EPSILON];
          prods.push({ lhs: Ai, rhs: newRhs });
        }
      }
    }

    var recursive = prods.filter(function(p) { return p.lhs === Ai && p.rhs[0] === Ai; });
    var nonRecursive = prods.filter(function(p) { return p.lhs === Ai && p.rhs[0] !== Ai; });
    if (recursive.length === 0) continue;

    prods = prods.filter(function(p) { return p.lhs !== Ai; });
    var prime = Ai + "'";

    for (var k = 0; k < nonRecursive.length; k++) {
      var rhs;
      if (nonRecursive[k].rhs[0] === EPSILON) {
        rhs = [prime];
      } else {
        rhs = nonRecursive[k].rhs.concat([prime]);
      }
      prods.push({ lhs: Ai, rhs: rhs });
    }
    if (nonRecursive.length === 0) prods.push({ lhs: Ai, rhs: [prime] });

    for (var k = 0; k < recursive.length; k++) {
      var alpha = recursive[k].rhs.slice(1);
      var rhs = alpha.length > 0 ? alpha.concat([prime]) : [prime];
      prods.push({ lhs: prime, rhs: rhs });
    }
    prods.push({ lhs: prime, rhs: [EPSILON] });
  }

  return buildGrammar(prods, grammar.start);
}

function applyLeftFactoring(grammar) {
  var prods = grammar.prods.slice();
  var changed = true;

  while (changed) {
    changed = false;
    var allNts = Array.from(new Set(prods.map(function(p) { return p.lhs; })));

    for (var n = 0; n < allNts.length; n++) {
      var nt = allNts[n];
      var ntProds = prods.filter(function(p) { return p.lhs === nt; });
      var prefix = longestCommonPrefix(ntProds);
      if (prefix.length === 0) continue;

      var matching = ntProds.filter(function(p) { return arrStartsWith(p.rhs, prefix); });
      var notMatching = ntProds.filter(function(p) { return !arrStartsWith(p.rhs, prefix); });
      if (matching.length < 2) continue;

      var existingNames = new Set(prods.map(function(p) { return p.lhs; }));
      var prime = nt + "'";
      while (existingNames.has(prime)) prime += "'";

      prods = prods.filter(function(p) { return p.lhs !== nt; });
      prods.push({ lhs: nt, rhs: prefix.concat([prime]) });

      for (var k = 0; k < notMatching.length; k++) {
        prods.push(notMatching[k]);
      }

      for (var k = 0; k < matching.length; k++) {
        var rest = matching[k].rhs.slice(prefix.length);
        prods.push({ lhs: prime, rhs: rest.length > 0 ? rest : [EPSILON] });
      }

      changed = true;
      break;
    }
  }

  return buildGrammar(prods, grammar.start);
}

function longestCommonPrefix(prods) {
  var best = [];
  for (var i = 0; i < prods.length; i++) {
    for (var j = i + 1; j < prods.length; j++) {
      var cp = commonPrefixArr(prods[i].rhs, prods[j].rhs);
      if (cp.length > best.length) best = cp;
    }
  }
  return best;
}

function commonPrefixArr(a, b) {
  var r = [];
  var len = Math.min(a.length, b.length);
  for (var i = 0; i < len; i++) {
    if (a[i] === b[i]) r.push(a[i]);
    else break;
  }
  return r;
}

function arrStartsWith(arr, prefix) {
  for (var i = 0; i < prefix.length; i++) {
    if (arr[i] !== prefix[i]) return false;
  }
  return true;
}

function buildGrammar(prods, startSymbol) {
  var nonTerminals = new Set(prods.map(function(p) { return p.lhs; }));
  var terminals = new Set();
  for (var i = 0; i < prods.length; i++) {
    for (var j = 0; j < prods[i].rhs.length; j++) {
      var sym = prods[i].rhs[j];
      if (!nonTerminals.has(sym) && sym !== EPSILON) terminals.add(sym);
    }
  }
  return { prods: prods, nonTerminals: nonTerminals, terminals: terminals, start: startSymbol };
}

//comparison of parsers
function renderComparison(grammar, inputTokens) {
  var results = [];

  // Helper function jo ek single parser ko try-catch block mein chalati hai
  function tryRun(name, desc, hasStates, runFn) {
    try {
      results.push(runFn());
    } catch(e) {
      // Agar kisi algorithm mein crash ya infinite loop ho, toh benchmarking rukegi nahi
      results.push({ name: name, desc: desc, build: 0, parse: 0, accepted: null, conflicts: 0, states: hasStates ? 0 : null, steps: 0, err: String(e) });
    }
  }

  // 1. LL(1) Comparison Run
  tryRun("LL(1)", "Top-down", false, function() {
    var g = grammar;
    // LL(1) ke liye pehle grammar ko transform karna padta hai (Viva point!)
    try { g = removeLeftRecursion(g); } catch(e) {}
    try { g = applyLeftFactoring(g); } catch(e) {}
    var fs = computeFirst(g), fw = computeFollow(g, fs);
    
    var t0 = performance.now(); // Table banane ka time start
    var ll1r = buildLL1Table(g, fs, fw);
    var t1 = performance.now(); // Parsing ka time start
    var pr = parseLL1(g, ll1r.table, inputTokens);
    
    return { 
      name:"LL(1)", desc:"Top-down", 
      build: t1 - t0, 
      parse: performance.now() - t1,
      accepted: pr.accepted, 
      conflicts: ll1r.conflicts.length, 
      states: null, 
      steps: pr.steps.length 
    };
  });

  // 2. LR(0) Comparison Run (Bottom-up without lookahead)
  tryRun("LR(0)", "Bottom-up (no lookahead)", true, function() {
    var t0 = performance.now();
    var r = buildLR0Table(grammar);
    var t1 = performance.now();
    var pr = parseLR(grammar, r.action, r.goto, inputTokens);
    return { 
      name:"LR(0)", desc:"Bottom-up", 
      build: t1 - t0, 
      parse: performance.now() - t1,
      accepted: pr.accepted, 
      conflicts: r.conflicts.length, 
      states: r.states.length, 
      steps: pr.steps.length 
    };
  });

  // 3. SLR(1) Comparison Run (Using FOLLOW sets)
  tryRun("SLR(1)", "LR(0) + FOLLOW sets", true, function() {
    var t0 = performance.now();
    var r = buildSLR1Table(grammar);
    var t1 = performance.now();
    var pr = parseLR(grammar, r.action, r.goto, inputTokens);
    return { 
      name:"SLR(1)", desc:"SLR Logic", 
      build: t1 - t0, 
      parse: performance.now() - t1,
      accepted: pr.accepted, 
      conflicts: r.conflicts.length, 
      states: r.states.length, 
      steps: pr.steps.length 
    };
  });

  // 4. LALR(1) Comparison Run (The most powerful)
  tryRun("LALR(1)", "Merged LR(1) states", true, function() {
    var t0 = performance.now();
    var r = buildLALR1Table(grammar);
    var t1 = performance.now();
    var pr = parseLR(grammar, r.action, r.goto, inputTokens);
    return { 
      name:"LALR(1)", desc:"Industry Standard", 
      build: t1 - t0, 
      parse: performance.now() - t1,
      accepted: pr.accepted, 
      conflicts: r.conflicts.length, 
      states: r.states.length, 
      steps: pr.steps.length 
    };
  });

  // Step: UI cards build karna jo Result aur Conflicts dikhayenge
  var html = '<div class="cmp-cards">';
  for (var i = 0; i < results.length; i++) {
    var r = results[i];
    var resultVal = r.accepted === null ? "\u2014" : r.accepted ? '<span class="val-ok">Accept</span>' : '<span class="val-err">Reject</span>';
    var conflictVal = r.conflicts > 0 ? '<span class="val-err">' + r.conflicts + "</span>" : '<span class="val-ok">0</span>';
    html += '<div class="cmp-card">';
    html += '<div class="cmp-name">' + r.name + "</div>";
    html += '<div style="font-size:10px;color:#475569;margin-bottom:8px;">' + r.desc + "</div>";
    html += cmpRow("Result", resultVal);
    html += cmpRow("Conflicts", conflictVal);
    if (r.states !== null) html += cmpRow("States", '<span class="val-c">' + r.states + "</span>");
    html += cmpRow("Steps",  '<span class="val-y">' + r.steps + "</span>");
    html += cmpRow("Build",  '<span class="val-c">' + r.build.toFixed(3) + "ms</span>");
    html += cmpRow("Parse",  '<span class="val-c">' + r.parse.toFixed(3) + "ms</span>");
    if (r.err) html += '<div style="font-size:10px;color:#f87171;margin-top:4px;">' + r.err.slice(0, 60) + "</div>";
    html += "</div>";
  }
  html += "</div>";

  // Step: Bar charts ke liye maximum values calculate karna (Scaling ke liye)
  var maxBuild = 0.001, maxConf = 1, maxSteps = 1;
  for (var i = 0; i < results.length; i++) {
    if (results[i].build     > maxBuild) maxBuild = results[i].build;
    if (results[i].conflicts > maxConf)  maxConf  = results[i].conflicts;
    if (results[i].steps     > maxSteps) maxSteps = results[i].steps;
  }

  // Graphs render karna (Visual Comparison)
  html += barSection("Build Time (Speed)", results, function(r) { return r.build; }, maxBuild, "#0891b2", function(r) { return r.build.toFixed(3) + "ms"; });
  html += barSection("Parse Steps (Efficiency)", results, function(r) { return r.steps; }, maxSteps, "#7c3aed", function(r) { return r.steps; });
  html += barSection("Conflicts (Grammar Power)", results, function(r) { return r.conflicts; }, maxConf, "#dc2626", function(r) { return r.conflicts; });

  // Final Table: Examiners ko theoretical differences dikhane ke liye
  html += '<div class="bar-section" style="overflow:auto;">';
  html += '<div class="bar-title">Parser Capabilities Table</div>';
  html += '<table style="font-size:11px;border-collapse:collapse;width:100%;"><thead><tr>';
  html += '<th style="background:#1e293b;padding:6px 10px;text-align:left;border:1px solid #334155;color:#64748b;">Property</th>';
  var names = ["LL(1)", "LR(0)", "SLR(1)", "LALR(1)"];
  for (var i = 0; i < names.length; i++) {
    html += '<th style="background:#1e293b;padding:6px 10px;text-align:center;border:1px solid #334155;color:#22d3ee;">' + names[i] + "</th>";
  }
  html += "</tr></thead><tbody>";
  html += powerRow("Direction",      ["Top-down", "Bottom-up", "Bottom-up", "Bottom-up"]);
  html += powerRow("Left recursion", ["\u2717 (Handled manually)", "\u2713 (Yes)", "\u2713 (Yes)", "\u2713 (Yes)"]);
  html += powerRow("Power Level",    ["Weak", "Weakest", "Medium", "Strong"]);
  html += powerRow("Real-world use", ["Hand-written", "Educational", "Academic", "Yacc/Bison"]);
  html += "</tbody></table></div>";

  return html;
}

// Helper functions for UI rendering
function barSection(title, results, valFn, max, color, displayFn) {
  var html = '<div class="bar-section"><div class="bar-title">' + title + "</div>";
  for (var i = 0; i < results.length; i++) {
    html += barRow(results[i].name, valFn(results[i]), max, color, displayFn(results[i]));
  }
  return html + "</div>";
}

function cmpRow(k, v) {
  return '<div class="cmp-row"><span class="cmp-key">' + k + "</span><span>" + v + "</span></div>";
}

function barRow(lbl, val, max, color, display) {
  var pct = max > 0 ? (val / max * 100) : 0; // Bar ki width % mein nikalna
  return '<div class="bar-row">' +
    '<span class="bar-lbl">' + lbl + "</span>" +
    '<div class="bar-track"><div class="bar-fill" style="width:' + pct + "%;background:" + color + ';"></div></div>' +
    '<span class="bar-val">' + display + "</span></div>";
}

function powerRow(prop, vals) {
  var cells = "";
  for (var i = 0; i < vals.length; i++) {
    var cls = (vals[i] === "\u2713") ? "val-ok" : (vals[i] === "\u2717") ? "val-err" : "";
    cells += '<td style="border:1px solid #1e293b;padding:5px 10px;text-align:center;" class="' + cls + '">' + vals[i] + "</td>";
  }
  return '<tr><td style="border:1px solid #1e293b;padding:5px 10px;color:#94a3b8;">' + prop + "</td>" + cells + "</tr>";
}
// update render compare
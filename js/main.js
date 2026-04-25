function runParser() {
  var grammarText = document.getElementById("grammar-input").value.trim();
  var inputText = document.getElementById("input-string").value.trim();

  // UI reset kar rahe hain har run se pehle
  setHTML("checks-area", "");
  setHTML("results-area", "");
  setHTML("error-area", "");

  // grammar parse karna (text → structured object)
  var parsed = parseGrammar(grammarText);
  if (!parsed.grammar) {
    setHTML("error-area", '<div class="alert-error">Grammar error: ' + parsed.error + "</div>");
    return;
  }
  var grammar = parsed.grammar;

  // input string ko tokens me convert karna (space-separated)
  var inputTokens = inputText.split(/\s+/).filter(function(t) { return t.length > 0; });

  // FIRST & FOLLOW sets calculate kar rahe hain
  var firstSets = computeFirst(grammar);
  var followSets = computeFollow(grammar, firstSets);

  // grammar me issues detect kar rahe hain
  var issues = {
    lr: checkLeftRecursion(grammar),   // left recursion check
    lf: checkLeftFactoring(grammar),   // left factoring check
    amb: checkAmbiguity(grammar, firstSets, followSets), // ambiguity check
  };

  var workingGrammar = grammar;
  var transformNote = "";
  var isLL1 = activeParser === "ll1";

  if (isLL1) {
    // LL(1) ke liye grammar ko clean karna padta hai (LR parsers ko nahi)
    if (issues.lr.length > 0) {
      workingGrammar = removeLeftRecursion(workingGrammar);
      transformNote += "Left recursion removed. ";
    }
    if (issues.lf.length > 0) {
      workingGrammar = applyLeftFactoring(workingGrammar);
      transformNote += "Left factoring applied.";
    }
  }

  // UI me checks + productions show karna
  var checksHtml = renderChecks(grammar, issues, isLL1, transformNote ? "Auto-transformed for LL(1): " + transformNote : "");
  checksHtml += renderProductions(grammar, "Original Productions");

  // agar transform hua hai toh usko separately highlight kar rahe hain
  if (isLL1 && transformNote) {
    checksHtml += renderProductions(
      workingGrammar,
      "Transformed Productions (used for LL(1))",
      "border:1px solid #166534;border-radius:6px;padding:8px;"
    );
  }
  setHTML("checks-area", checksHtml);

  var parseResult = null;
  var tableHtml = "";
  var stepsHtml = "";
  var treeHtml = "";
  var statesHtml = "";
  var ffHtml = "";

  // performance measure start
  var parserStart = performance.now();

  if (activeParser === "ll1") {
    // LL(1) ke liye transformed grammar use hota hai
    var wFirst = computeFirst(workingGrammar);
    var wFollow = computeFollow(workingGrammar, wFirst);

    // LL(1) table build karna
    var ll1r = buildLL1Table(workingGrammar, wFirst, wFollow);

    // parsing run karna
    parseResult = parseLL1(workingGrammar, ll1r.table, inputTokens);
    parseResult.elapsed = performance.now() - parserStart;

    // UI components
    ffHtml = renderFirstFollow(workingGrammar, wFirst, wFollow);
    tableHtml = renderLL1Table(workingGrammar, ll1r);
    stepsHtml = renderStepsLL1(parseResult);
    treeHtml = renderParseTree(parseResult.tree, workingGrammar);

  } else {
    var tableResult;

    // parser type ke basis pe table build karna
    if (activeParser === "lr0") tableResult = buildLR0Table(grammar);
    else if (activeParser === "slr1") tableResult = buildSLR1Table(grammar);
    else tableResult = buildLALR1Table(grammar);

    // LR parsing run karna
    parseResult = parseLR(grammar, tableResult.action, tableResult.goto, inputTokens);
    parseResult.elapsed = performance.now() - parserStart;

    // UI components
    statesHtml = renderLRStates(tableResult.states, grammar);

    // ACTION + GOTO tables render
    tableHtml = renderLRTable(
      tableResult.states, grammar,
      tableResult.action, tableResult.goto,
      tableResult.conflicts,
      activeParser.toUpperCase()
    );

    stepsHtml = renderStepsLR(parseResult);
    treeHtml = renderParseTree(parseResult.tree, grammar);

    // global store for UI interactions (state click etc.)
    window._lrStates = tableResult.states;
    window._lrGrammar = grammar;
  }

  var tabs;

  // LL(1) vs LR ke UI tabs alag hain
  if (isLL1) {
    tabs = [
      { id: "ff", label: "FIRST/FOLLOW", content: ffHtml },
      { id: "table", label: "LL(1) Table", content: tableHtml },
      { id: "steps", label: "Parse Steps", content: stepsHtml },
      { id: "tree", label: "Parse Tree", content: treeHtml },
      { id: "cmp", label: "Comparison", content: "" },
    ];
  } else {
    tabs = [
      { id: "states", label: "LR States", content: statesHtml },
      { id: "table", label: "Parse Table", content: tableHtml },
      { id: "steps", label: "Parse Steps", content: stepsHtml },
      { id: "tree", label: "Parse Tree", content: treeHtml },
      { id: "cmp", label: "Comparison", content: "" },
    ];
  }

  var accepted = parseResult.accepted;
  var elapsed = parseResult.elapsed.toFixed(2);

  // final UI build (tabs + result status)
  var html = '<div class="card" style="padding:0;">';

  html += '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:8px 8px 0;">';

  // tab buttons render
  html += '<div class="tabs-bar" style="flex:1;border-bottom:none;">';
  for (var i = 0; i < tabs.length; i++) {
    html += '<button class="tab-btn ' + (i === 0 ? "active" : "") + '" onclick="switchTab(\'' + tabs[i].id + '\',this)">' + tabs[i].label + "</button>";
  }
  html += "</div>";

  // result + time display
  html += '<div style="padding:4px 8px;display:flex;gap:8px;align-items:center;">';
  html += '<span class="result-badge ' + (accepted ? "result-ok" : "result-err") + '">' + (accepted ? "✓ Accepted" : "✗ Rejected") + "</span>";
  html += '<span class="bench-info"><span class="bench-time">' + elapsed + "ms</span></span>";
  html += "</div></div>";

  html += '<div style="border-top:1px solid #1e293b;"></div>';

  // tab content render
  for (var i = 0; i < tabs.length; i++) {
    var t = tabs[i];
    var isComp = t.id === "cmp";

    html += '<div class="tab-content" id="tab-' + t.id + '" style="display:' + (i === 0 ? "block" : "none") + ';">';

    if (isComp) {
      html += '<div id="cmp-content">Click to load comparison...</div>';
    } else {
      html += t.content;
    }

    html += "</div>";
  }

  html += "</div>";

  setHTML("results-area", html);

  // later use ke liye results store kar rahe hain
  lastResults = {
    grammar: grammar,
    workingGrammar: workingGrammar,
    inputTokens: inputTokens,
    isLL1: isLL1
  };
}

function switchTab(tabId, btn) {
  var tabs = document.querySelectorAll(".tab-content");

  // sab tabs hide kar do
  for (var i = 0; i < tabs.length; i++) tabs[i].style.display = "none";

  var buttons = document.querySelectorAll(".tab-btn");

  // active class remove karna
  for (var i = 0; i < buttons.length; i++) buttons[i].classList.remove("active");

  // selected tab show karna
  var target = document.getElementById("tab-" + tabId);
  if (target) target.style.display = "block";
  if (btn) btn.classList.add("active");

  // comparison tab dynamically load hota hai
  if (tabId === "cmp" && lastResults) {
    var g = lastResults.isLL1 ? lastResults.workingGrammar : lastResults.grammar;
    setHTML("cmp-content", renderComparison(g, lastResults.inputTokens));
  }
}

function selectLRState(id) {
  if (!window._lrStates || !window._lrGrammar) return;

  var state = null;

  // selected state find karna
  for (var i = 0; i < window._lrStates.length; i++) {
    if (window._lrStates[i].id === id) {
      state = window._lrStates[i];
      break;
    }
  }

  if (!state) return;

  // state detail render
  setHTML("state-detail-panel", renderStateDetail(state, window._lrGrammar));

  // UI me active highlight
  var buttons = document.querySelectorAll(".state-btn");
  for (var i = 0; i < buttons.length; i++) buttons[i].classList.remove("active");

  var btn = document.getElementById("sbtn-" + id);
  if (btn) {
    btn.classList.add("active");
    btn.scrollIntoView({ block: "nearest" });
  }
}

function loadExample(key) {
  var ex = EXAMPLES[key];
  if (!ex) return;

  // example grammar + input fill karna
  document.getElementById("grammar-input").value = ex.grammar;
  document.getElementById("input-string").value = ex.input;
}

function setParser(type) {
  activeParser = type;

  var buttons = document.querySelectorAll(".parser-btn");

  // selected parser highlight karna
  for (var i = 0; i < buttons.length; i++) {
    if (buttons[i].dataset.parser === type) {
      buttons[i].classList.add("active");
    } else {
      buttons[i].classList.remove("active");
    }
  }
}

// global expose (HTML onclick se call ho sake)
window.runParser = runParser;
window.switchTab = switchTab;
window.selectLRState = selectLRState;
window.loadExample = loadExample;
window.setParser = setParser;

// page load hote hi default example load karna
window.addEventListener("DOMContentLoaded", function() {
  loadExample("arithmetic");
});
function renderChecks(grammar, issues, transformed, transformNote) {
  var html = '<div class="checks-row">';

  function badge(label, found, autoFixed) {
    var cls  = found ? (autoFixed ? "check-fixed" : "check-bad") : "check-ok";
    var icon = found ? (autoFixed ? "\u26A1" : "\u2717") : "\u2713";
    var suffix = (found && autoFixed) ? " (auto-fixed)" : "";
    return '<div class="check-badge ' + cls + '">' + icon + " " + label + suffix + "</div>";
  }

  html += badge("Left Recursion",        issues.lr.length  > 0, transformed && issues.lr.length  > 0);
  html += badge("Left Factoring Needed", issues.lf.length  > 0, transformed && issues.lf.length  > 0);
  html += badge("Ambiguity",             issues.amb.length > 0, false);
  html += "</div>";

  var allIssues = issues.lr.concat(issues.lf).concat(issues.amb);
  if (allIssues.length > 0) {
    html += '<div class="alert-warn" style="margin-bottom:10px;">';
    for (var i = 0; i < allIssues.length; i++) {
      html += "\u2022 " + allIssues[i];
      if (i < allIssues.length - 1) html += "<br>";
    }
    html += "</div>";
  }

  if (transformNote) {
    html += '<div class="alert-ok">' + transformNote + "</div>";
  }
  return html;
}

function renderProductions(grammar, title, extraClass) {
  var html = '<div class="section-title">' + title + "</div>";
  html += '<div class="prod-list" style="' + (extraClass || "") + '">';
  for (var i = 0; i < grammar.prods.length; i++) {
    var p = grammar.prods[i];
    html += '<div class="prod-item">';
    html += '<span class="prod-num">' + i + ".</span>";
    html += '<span class="prod-lhs">' + p.lhs + "</span>";
    html += '<span class="prod-arr">\u2192</span>';
    html += '<span class="prod-rhs">' + p.rhs.join(" ") + "</span>";
    html += "</div>";
  }
  html += "</div>";
  return html;
}

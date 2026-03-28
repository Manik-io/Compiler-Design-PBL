function renderStepsLL1(parseResult) {
  var html = renderStepsHeader(parseResult);
  html += '<div class="steps-wrap"><table class="steps-table"><thead><tr>';
  html += '<th style="width:50px;">Step</th><th>Stack</th><th>Input</th><th>Action</th>';
  html += "</tr></thead><tbody>";

  for (var i = 0; i < parseResult.steps.length; i++) {
    var s = parseResult.steps[i];
    var isAcc = s.action === "Accept";
    var isErr = s.action.startsWith("Error");
    html += '<tr class="' + (isAcc ? "row-accept" : isErr ? "row-error" : "") + '">';
    html += '<td style="text-align:center;color:#475569;">' + s.step + "</td>";
    html += "<td>" + renderStackTokens(s.stack) + "</td>";
    html += "<td>" + renderInputTokens(s.input) + "</td>";
    html += '<td class="' + actionCls(s.action) + '">' + s.action + "</td>";
    html += "</tr>";
  }
  html += "</tbody></table></div>";
  return html;
}
function renderStepsHeader(r) {
  var badge = r.accepted
    ? '<span class="result-badge result-ok">\u2713 Accepted</span>'
    : '<span class="result-badge result-err">\u2717 Rejected</span>';
  var info    = '<span class="bench-info">' + r.steps.length + " steps</span>";
  var errHtml = r.error ? '<span style="color:#f87171;font-size:11px;">' + r.error + "</span>" : "";
  return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap;">' +
    badge + info + errHtml + "</div>";
}



function renderStepsLR(parseResult) {
  var html = renderStepsHeader(parseResult);
  html += '<div class="steps-wrap"><table class="steps-table"><thead><tr>';
  html += '<th style="width:50px;">Step</th><th>State Stack</th><th>Symbol Stack</th><th>Input</th><th>Action</th>';
  html += "</tr></thead><tbody>";

  for (var i = 0; i < parseResult.steps.length; i++) {
    var s = parseResult.steps[i];
    var isAcc = s.action === "Accept";
    var isErr = s.action.startsWith("Error");
    html += '<tr class="' + (isAcc ? "row-accept" : isErr ? "row-error" : "") + '">';
    html += '<td style="text-align:center;color:#475569;">' + s.step + "</td>";

    var stateNums = "";
    for (var j = 0; j < s.stateStack.length; j++) {
      stateNums += '<span class="st-num">' + s.stateStack[j] + "</span> ";
    }
    html += "<td>" + stateNums + "</td>";
    html += "<td>" + renderStackTokens(s.symStack ? s.symStack.join(" ") : "") + "</td>";
    html += "<td>" + renderInputTokens(s.input) + "</td>";
    html += '<td class="' + actionCls(s.action) + '">' + s.action + "</td>";
    html += "</tr>";
  }
  html += "</tbody></table></div>";
  return html;
}

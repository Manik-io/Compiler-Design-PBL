//updated a var
function renderLRTable(states, grammar, actionMap, gotoMap, conflicts, parserName) {
  var terms = Array.from(grammar.terminals).concat([END]);
  var nts   = Array.from(grammar.nonTerminals);

  function actionStr(cell) {
    if (!cell || cell.length === 0) return null;
    var a = cell[0];
    if (a.type === "shift")  return { label: "s" + a.state, cls: "td-shift" };
    if (a.type === "reduce") return { label: "r: " + a.prod.lhs + "\u2192" + a.prod.rhs.join(""), cls: "td-reduce" };
    if (a.type === "accept") return { label: "ACC", cls: "td-accept" };
    return null;
  }

  var unique = Array.from(new Set(conflicts));
  var html = conflicts.length === 0
    ? '<div class="alert-ok">\u2713 ' + parserName + " table built \u2014 no conflicts.</div>"
    : '<div class="alert-error">\u2717 ' + conflicts.length + " conflict(s) in " + parserName + ": " + unique.slice(0,5).join(", ") + (conflicts.length > 5 ? "..." : "") + "</div>";

  html += '<div class="table-wrap"><table><thead>';
  html += '<tr><th class="hdr-state" rowspan="2">State</th>';
  html += '<th class="hdr-action" colspan="' + terms.length + '">ACTION</th>';
  html += '<th class="hdr-goto" colspan="' + nts.length + '">GOTO</th></tr><tr>';
  for (var i = 0; i < terms.length; i++) html += '<th class="hdr-action hdr-term">' + terms[i] + "</th>";
  for (var i = 0; i < nts.length; i++)   html += '<th class="hdr-goto hdr-nt">' + nts[i] + "</th>";
  html += "</tr></thead><tbody>";

  for (var si = 0; si < states.length; si++) {
    var state = states[si];
    html += '<tr><td class="td-state">' + state.id + "</td>";

    for (var i = 0; i < terms.length; i++) {
      var stateRow = actionMap.get(state.id);
      var cell = stateRow ? stateRow.get(terms[i]) : null;
      var info = actionStr(cell);
      if (!info) {
        html += '<td class="td-empty">\u2014</td>';
      } else if (cell.length > 1) {
        var labels = [];
        for (var j = 0; j < cell.length; j++) {
          var r = actionStr([cell[j]]);
          if (r) labels.push(r.label);
        }
        html += '<td class="td-conflict">' + labels.join("<br>") + "</td>";
      } else {
        html += '<td class="' + info.cls + '">' + info.label + "</td>";
      }
    }

    for (var i = 0; i < nts.length; i++) {
      var gRow = gotoMap.get(state.id);
      var g = gRow ? gRow.get(nts[i]) : undefined;
      html += g !== undefined ? '<td class="td-goto">' + g + "</td>" : '<td class="td-empty">\u2014</td>';
    }
    html += "</tr>";
  }

  html += "</tbody></table></div>";
  html += '<div style="font-size:10px;color:#475569;margin-top:8px;"><b>sN</b>=Shift\u2192state N &nbsp; <b>r:A\u2192\u03b1</b>=Reduce &nbsp; <b>ACC</b>=Accept &nbsp; <b>\u2014</b>=Error</div>';
  return html;
}
//neew function adds

function renderLL1Table(grammar, ll1Result) {
  var table = ll1Result.table;
  var conflicts = ll1Result.conflicts;
  var nts   = Array.from(grammar.nonTerminals);
  var terms = Array.from(grammar.terminals).concat([END]);

  var html = ll1Result.isLL1
    ? '<div class="alert-ok">\u2713 Grammar is LL(1) \u2014 no conflicts in the parsing table.</div>'
    : '<div class="alert-error">\u2717 ' + conflicts.length + " conflict(s): " + Array.from(new Set(conflicts)).join(", ") + "</div>";

  html += '<div class="table-wrap"><table><thead><tr>';
  html += '<th class="hdr-state">NT \\ Terminal</th>';
  for (var i = 0; i < terms.length; i++) {
    html += '<th class="hdr-action hdr-term">' + terms[i] + "</th>";
  }
  html += "</tr></thead><tbody>";

  for (var n = 0; n < nts.length; n++) {
    html += '<tr><td class="td-state">' + nts[n] + "</td>";
    for (var i = 0; i < terms.length; i++) {
      var row  = table.get(nts[n]);
      var cell = row ? row.get(terms[i]) : null;
      if (!cell || cell.length === 0) {
        html += '<td class="td-empty">\u2014</td>';
      } else if (cell.length > 1) {
        var texts = [];
        for (var j = 0; j < cell.length; j++) texts.push(nts[n] + "\u2192" + cell[j].rhs.join(" "));
        html += '<td class="td-conflict">' + texts.join("<br>") + "</td>";
      } else {
        html += '<td class="td-shift">' + nts[n] + " \u2192 " + cell[0].rhs.join(" ") + "</td>";
      }
    }
    html += "</tr>";
  }

  html += "</tbody></table></div>";
  html += '<div style="font-size:10px;color:#475569;margin-top:8px;">M[A, a] = production to expand A when next token is a. Red cells = conflict (not LL(1)).</div>';
  return html;
}



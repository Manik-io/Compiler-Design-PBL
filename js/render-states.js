function renderLRStates(states, grammar) {
  var listHtml = "";
  for (var i = 0; i < states.length; i++) {
    var s = states[i];
    listHtml += '<button class="state-btn ' + (s.id === 0 ? "active" : "") + '"';
    listHtml += ' onclick="selectLRState(' + s.id + ')" id="sbtn-' + s.id + '">';
    listHtml += "<strong>State " + s.id + "</strong>";
    listHtml += '<div style="font-size:10px;color:#64748b;">' + s.items.length + " item(s)</div>";
    listHtml += "</button>";
  }

  return '<div class="states-layout">' +
    '<div class="state-list">' + listHtml + "</div>" +
    '<div class="state-detail" id="state-detail-panel">' +
    renderStateDetail(states[0], grammar) +
    "</div></div>";
}

function renderStateDetail(state, grammar) {
  if (!state) return "";

  var html = '<div style="font-size:13px;font-weight:700;color:#22d3ee;margin-bottom:10px;">';
  html += "State " + state.id;
  html += ' <span style="font-size:11px;font-weight:normal;color:#64748b;">(' + state.items.length + " items)</span></div>";
  html += '<div class="section-title">Items</div>';

  for (var i = 0; i < state.items.length; i++) {
    var item = state.items[i];
    var prod = item.prod;
    var rhs  = prod.rhs;
    var atEnd = dotSym(item) === null;

    html += '<div class="item-row ' + (atEnd ? "reduce-item" : "") + '">';
    html += '<span class="sym-nt">' + prod.lhs + '</span><span style="color:#64748b;">\u2192</span>';

    if (rhs.length === 1 && rhs[0] === EPSILON) {
      html += '<span class="dot">\u2022</span><span style="color:#64748b;">(\u03b5)</span>';
    } else {
      for (var j = 0; j <= rhs.length; j++) {
        if (j === item.dot) html += '<span class="dot">\u2022</span>';
        if (j < rhs.length) {
          var sym = rhs[j];
          html += '<span class="' + (grammar.nonTerminals.has(sym) ? "sym-nt" : "sym-t") + '">' + sym + "</span>";
        }
      }
    }

    if (item.lookahead) {
      html += '<span style="color:#475569;font-size:10px;margin-left:6px;">, ' + item.lookahead + "</span>";
    }
    if (atEnd) html += '<span class="reduce-badge">REDUCE</span>';
    html += "</div>";
  }

  if (state.trans.size > 0) {
    html += '<div class="section-title" style="margin-top:12px;">Transitions</div><div class="trans-list">';
    for (var entry of state.trans) {
      var sym = entry[0], target = entry[1];
      var isNT = grammar.nonTerminals.has(sym) || sym.endsWith("'");
      html += '<button class="trans-btn ' + (isNT ? "trans-nt" : "trans-t") + '"';
      html += ' onclick="selectLRState(' + target + ')">' + sym + " \u2192 S" + target + "</button>";
    }
    html += "</div>";
  }
  return html;
}

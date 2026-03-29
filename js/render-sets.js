function renderFirstFollow(grammar, firstSets, followSets) {
  var nts = Array.from(grammar.nonTerminals);

  function table(title, color, getter) {
    var html = '<div><div class="ff-section-title">' + title + "</div>";
    html += '<div class="ff-table-wrap"><table>';
    html += '<thead><tr>';
    html += '<th class="hdr-nt">Non-Terminal</th>';
    html += '<th style="color:' + color + ';">' + title + "( )</th>";
    html += "</tr></thead><tbody>";
    for (var i = 0; i < nts.length; i++) {
      var vals = Array.from(getter(nts[i]) || []).sort().join(", ");
      html += "<tr>";
      html += '<td class="tok-nt">' + nts[i] + "</td>";
      html += '<td style="color:' + color + '; text-align:left;">{  ' + vals + "  }</td>";
      html += "</tr>";
    }
    html += "</tbody></table></div></div>";
    return html;
  }

  return '<div class="ff-grid">' +
    table("FIRST",  "#86efac", function(nt) { return firstSets.get(nt); }) +
    table("FOLLOW", "#67e8f9", function(nt) { return followSets.get(nt); }) +
    '</div>' +
    '<div style="font-size:11px;color:#475569;margin-top:10px;">' +
    "FIRST(A) = terminals that can start a string derived from A. &nbsp;" +
    "FOLLOW(A) = terminals that can appear immediately after A." +
    "</div>";
}
// update render sets

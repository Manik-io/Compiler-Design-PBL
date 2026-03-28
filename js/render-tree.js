
function renderTreeVisual(node, grammar) {
  var isNT  = grammar.nonTerminals.has(node.label);
  var isEps = node.label === EPSILON;
  var cls   = isEps ? "node-eps" : isNT ? "node-nt" : "node-t";

  var html = '<div class="node-wrap">';
  html += '<div class="node-label ' + cls + '">' + escHtml(node.label) + "</div>";

  if (node.children.length > 0) {
    html += '<div class="v-line"></div><div class="children-row">';
    for (var i = 0; i < node.children.length; i++) {
      html += '<div class="child-col"><div class="v-line"></div>';
      html += renderTreeVisual(node.children[i], grammar);
      html += "</div>";
    }
    html += "</div>";
  }
  html += "</div>";
  return html;
}
function renderParseTree(root, grammar) {
  if (!root) {
    return '<div class="empty-state">' +
      '<div class="icon">\uD83C\uDF33</div>' +
      "<h2>No Parse Tree</h2><p>Input was rejected or could not be parsed.</p>" +
      "</div>";
  }

  var visual = renderTreeVisual(root, grammar);
  var text   = treeToText(root, "", true);

  return '<div class="tree-grid">' +
    "<div>" +
    '<div class="ff-section-title">Visual Tree</div>' +
    '<div class="tree-visual">' + visual + "</div>" +
    "</div><div>" +
    '<div class="ff-section-title">Text Representation</div>' +
    '<div class="tree-text-box"><pre class="tree-pre">' + escHtml(text) + "</pre></div>" +
    "</div></div>" +
    '<div style="margin-top:8px;font-size:10px;display:flex;gap:12px;">' +
    '<span style="color:#c084fc;font-weight:bold;">\u25A0 Non-terminal</span>' +
    '<span style="color:#86efac;font-weight:bold;">\u25A0 Terminal</span>' +
    "</div>";
}

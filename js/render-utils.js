function setHTML(id, html) {
  var el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

function escHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderStackTokens(str) {
  var tokens = str.split(/\s+/).filter(function(s) { return s; });
  var parts = [];
  for (var i = 0; i < tokens.length; i++) {
    var tok = tokens[i];
    var cls = tok === END ? "tok-end" : /^[A-Z]/.test(tok) ? "tok-nt" : "tok-t";
    parts.push('<span class="' + cls + '">' + tok + "</span>");
  }
  return parts.join(" ");
}

function renderInputTokens(toks) {
  if (!toks) return "";
  var parts = [];
  for (var i = 0; i < toks.length; i++) {
    var cls = toks[i] === END ? "tok-end" : "tok-t";
    parts.push('<span class="' + cls + '">' + toks[i] + "</span>");
  }
  return parts.join(" ");
}

function actionCls(a) {
  if (a === "Accept") return "act-accept";
  if (a.startsWith("Error")) return "act-error";
  if (a.startsWith("Reduce") || a.startsWith("r:")) return "act-reduce";
  return "act-shift";
}

// Homepage hero: "insight moving outward" — slow radiating rings.
(function () {
  var canvas = document.getElementById("ripple");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var t = 0;

  function accentColor() {
    return getComputedStyle(document.documentElement).getPropertyValue("--hero-ring").trim() || "#45BCD4";
  }
  function hexToRgb(hex) {
    hex = hex.replace("#", "");
    if (hex.length === 3) hex = hex.split("").map(function (c) { return c + c; }).join("");
    var n = parseInt(hex, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function draw() {
    var w = canvas.clientWidth, h = canvas.clientHeight;
    var dpr = window.devicePixelRatio || 1;
    if (canvas.width !== w * dpr) { canvas.width = w * dpr; canvas.height = h * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    var cx = w * 0.16, cy = h * 0.2;
    var rgb = hexToRgb(accentColor());
    var maxR = Math.max(w, h) * 0.7;
    var ringCount = 7, spacing = maxR / ringCount;

    for (var i = 0; i < ringCount + 1; i++) {
      var r = ((i * spacing) + (reduced ? 0 : t)) % maxR;
      var fade = 1 - r / maxR;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + (0.10 * fade).toFixed(3) + ")";
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    if (!reduced) { t += 0.12; requestAnimationFrame(draw); }
  }
  draw();
  if (reduced) window.addEventListener("resize", draw);
})();

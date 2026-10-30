// Booking page: one page, two calendars ("you" = coaching, "org" = team or business).
// If an embed URL is set in js/config.js, the Google appointment page shows inline;
// otherwise a button opens it in a new tab.
(function () {
  var page = document.querySelector(".book-page");
  if (!page) return;
  var c = window.IO_CONFIG || {};
  var embed = document.getElementById("book-embed");
  var fallback = document.getElementById("book-fallback");
  var open = document.getElementById("book-open");
  var frames = {};

  function embedUrl(mode) {
    var url = mode === "org" ? c.BOOKING_EMBED_ORG : c.BOOKING_EMBED_COACHING;
    if (!url) return "";
    return url.indexOf("gv=true") === -1 ? url + (url.indexOf("?") === -1 ? "?" : "&") + "gv=true" : url;
  }

  function show(mode, push) {
    page.setAttribute("data-mode", mode);
    page.querySelectorAll(".book-switch-btn").forEach(function (b) {
      var on = b.getAttribute("data-for") === mode;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    page.querySelectorAll("[data-show]").forEach(function (el) { el.hidden = el.getAttribute("data-show") !== mode; });
    open.href = (mode === "org" ? c.BOOKING_URL_ORG : c.BOOKING_URL_COACHING) || open.href;
    var url = embedUrl(mode);
    Object.keys(frames).forEach(function (k) { frames[k].hidden = k !== mode; });
    if (url) {
      if (!frames[mode]) {
        var f = document.createElement("iframe");
        f.src = url;
        f.title = "Pick a time with Nima";
        frames[mode] = embed.appendChild(f);
      }
      embed.hidden = false; fallback.hidden = true;
    } else {
      embed.hidden = true; fallback.hidden = false;
    }
    if (push && window.history && history.replaceState) {
      history.replaceState(null, "", mode === "org" ? "?for=org" : location.pathname);
    }
    window.ioTrack("book_page_view", { for: mode });
  }

  page.querySelectorAll(".book-switch-btn").forEach(function (b) {
    b.addEventListener("click", function () { show(b.getAttribute("data-for"), true); });
  });
  open.addEventListener("click", function () {
    window.ioTrack(page.getAttribute("data-mode") === "org" ? "book_org_call_click" : "book_coaching_click", { from: "book" });
  });
  show(/[?&]for=org\b/.test(location.search) ? "org" : "you", false);
})();

// Booking page. Copy side: "you" or "org". Panel side: the free call (coaching or
// org calendar), the paid 1 hour session (Stripe link), or "paid" (back from Stripe:
// the session calendar). Google calendars show inline when an embed URL is set in
// js/config.js; otherwise a button opens the Google page in a new tab.
(function () {
  var page = document.querySelector(".book-page");
  if (!page) return;
  var c = window.IO_CONFIG || {};
  var $ = function (id) { return document.getElementById(id); };
  var embed = $("book-embed"), fallback = $("book-fallback"), open = $("book-open");
  var options = $("book-options"), session = $("book-session"), title = $("book-title"), note = $("book-note");
  var sessionOn = !!(c.SESSION_PAYMENT_LINK && (c.BOOKING_EMBED_SESSION || c.BOOKING_URL_SESSION));
  var frames = {};
  var state = { mode: "you", option: "call" };

  if (c.SESSION_PAYMENT_LINK) $("book-pay").href = c.SESSION_PAYMENT_LINK;

  function withGv(url) {
    if (!url) return "";
    return url.indexOf("gv=true") === -1 ? url + (url.indexOf("?") === -1 ? "?" : "&") + "gv=true" : url;
  }
  function calendar() {
    if (state.option === "paid") return { key: "session", embed: c.BOOKING_EMBED_SESSION, url: c.BOOKING_URL_SESSION };
    if (state.mode === "org") return { key: "org", embed: c.BOOKING_EMBED_ORG, url: c.BOOKING_URL_ORG };
    return { key: "coaching", embed: c.BOOKING_EMBED_COACHING, url: c.BOOKING_URL_COACHING };
  }
  function query() {
    if (state.option === "paid") return "?paid=session";
    if (state.mode === "org") return "?for=org";
    if (state.option === "session") return "?for=session";
    return "";
  }

  function render(push) {
    var paid = state.option === "paid", pay = state.option === "session";
    page.setAttribute("data-mode", state.mode);
    page.querySelectorAll(".book-switch-btn").forEach(function (b) {
      var on = b.getAttribute("data-for") === state.mode;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    page.querySelectorAll("[data-show]").forEach(function (el) { el.hidden = el.getAttribute("data-show") !== state.mode; });
    options.hidden = !(sessionOn && state.mode === "you" && !paid);
    options.querySelectorAll(".book-option").forEach(function (b) {
      var on = b.getAttribute("data-option") === state.option;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    title.textContent = paid ? "Payment received. Pick your time." : pay ? "1 hour coaching session" : "Pick a time";
    note.textContent = paid ? "Thank you. Choose a 60 minute slot below. Google Meet link by email."
      : pay ? "Pay first, then choose your time." : "Times show in your time zone. Google Meet link by email.";
    session.hidden = !pay;

    var cal = calendar(), src = withGv(cal.embed);
    Object.keys(frames).forEach(function (k) { frames[k].hidden = pay || k !== cal.key; });
    if (!pay && src) {
      if (!frames[cal.key]) {
        var f = document.createElement("iframe");
        f.src = src;
        f.title = "Pick a time with Nima";
        frames[cal.key] = embed.appendChild(f);
      }
      embed.hidden = false; fallback.hidden = true;
    } else {
      embed.hidden = true; fallback.hidden = pay;
      if (cal.url) open.href = cal.url;
    }
    if (push && window.history && history.replaceState) history.replaceState(null, "", location.pathname + query());
    window.ioTrack("book_page_view", { for: state.mode, option: state.option });
  }

  page.querySelectorAll(".book-switch-btn").forEach(function (b) {
    b.addEventListener("click", function () {
      state.mode = b.getAttribute("data-for");
      if (state.option !== "paid") state.option = "call";
      render(true);
    });
  });
  options.querySelectorAll(".book-option").forEach(function (b) {
    b.addEventListener("click", function () { state.option = b.getAttribute("data-option"); render(true); });
  });
  open.addEventListener("click", function () {
    window.ioTrack(state.mode === "org" ? "book_org_call_click" : "book_coaching_click", { from: "book", option: state.option });
  });

  var q = location.search;
  if (sessionOn && /[?&]paid=session\b/.test(q)) state.option = "paid";
  else if (sessionOn && /[?&]for=session\b/.test(q)) state.option = "session";
  if (/[?&]for=org\b/.test(q)) state.mode = "org";
  render(false);
})();

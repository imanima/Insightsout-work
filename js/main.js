// InsightsOut.work — shared behavior: analytics, mobile nav, event dates, subscribe, video.

// ---------- Analytics ----------
// Works standalone now (console + dataLayer); when Plausible/PostHog is
// added, their snippet picks these up via window.ioTrack.
window.dataLayer = window.dataLayer || [];
window.ioTrack = function (name, props) {
  var payload = Object.assign({ event: name, ts: Date.now() }, props || {});
  window.dataLayer.push(payload);
  if (window.plausible) window.plausible(name, { props: props });
  if (window.posthog) window.posthog.capture(name, props);
  if (console && console.debug) console.debug("[analytics]", name, props || "");
};

document.addEventListener("click", function (e) {
  var el = e.target.closest("[data-track]");
  if (el) window.ioTrack(el.getAttribute("data-track"), { href: el.href || null });
});

// ---------- Mobile navigation ----------
document.addEventListener("DOMContentLoaded", function () {
  var nav = document.querySelector("nav.site");
  if (!nav) return;
  var navInner = nav.querySelector(".nav-inner");
  var links = nav.querySelector(".nav-links");
  if (!navInner || !links) return;

  links.id = links.id || "primary-nav-links";
  var toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "btn btn-ghost btn-sm mobile-menu-toggle";
  toggle.textContent = "Menu";
  toggle.setAttribute("aria-controls", links.id);
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-label", "Open navigation menu");

  var headerAction = navInner.querySelector(":scope > .btn");
  navInner.insertBefore(toggle, headerAction || null);

  function closeMenu() {
    nav.classList.remove("mobile-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open navigation menu");
  }

  toggle.addEventListener("click", function () {
    var willOpen = !nav.classList.contains("mobile-open");
    nav.classList.toggle("mobile-open", willOpen);
    toggle.setAttribute("aria-expanded", String(willOpen));
    toggle.setAttribute("aria-label", willOpen ? "Close navigation menu" : "Open navigation menu");
  });
  links.addEventListener("click", function (e) {
    if (e.target.closest("a")) closeMenu();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeMenu();
  });
  document.addEventListener("click", function (e) {
    if (!nav.contains(e.target)) closeMenu();
  });
});

// ---------- Event dates ----------
// Any element with data-event-date="YYYY-MM-DD" is hidden once that day has
// passed (Pacific time), so a listing can't advertise a past date. A container
// with data-event-list shows its [data-event-empty] child when nothing is left.
document.addEventListener("DOMContentLoaded", function () {
  var today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" }); // YYYY-MM-DD
  document.querySelectorAll("[data-event-date]").forEach(function (el) {
    if (el.getAttribute("data-event-date") < today) el.hidden = true;
  });
  document.querySelectorAll("[data-event-list]").forEach(function (list) {
    var live = list.querySelectorAll("[data-event-date]:not([hidden])").length;
    var empty = list.querySelector("[data-event-empty]");
    if (empty) empty.hidden = live > 0;
  });
});

// ---------- Newsletter / subscribe ----------
// Every <form class="js-subscribe"> POSTs { email, source, consent } as JSON to
// IO_CONFIG.NEWSLETTER_ENDPOINT (/api/subscribe → Luma People list). Falls back
// to the Luma subscribe page. No form is on the site right now; kept for when one returns.
document.addEventListener("DOMContentLoaded", function () {
  var forms = Array.prototype.slice.call(document.querySelectorAll("form.js-subscribe"));
  if (!forms.length) return;
  var cfg = window.IO_CONFIG || {};
  var lumaUrl = cfg.LUMA_SUBSCRIBE_URL || cfg.LUMA_CALENDAR_URL || "https://luma.com/NimaImani";

  forms.forEach(function (nl) {
    var status = nl.querySelector(".form-status");
    var button = nl.querySelector('button[type="submit"]');
    function say(msg, cls) {
      if (!status) return;
      status.innerHTML = msg;
      status.className = status.className.replace(/\b(ok|err)\b/g, "").trim() + (cls ? " " + cls : "");
    }
    nl.addEventListener("submit", function (e) {
      e.preventDefault();
      var data = {};
      new FormData(nl).forEach(function (v, k) { data[k] = v; });
      if (!data.email) { say("Please add your email.", "err"); return; }
      if (!data.consent) { say("Please confirm that you want to receive InsightsOut updates.", "err"); return; }
      window.ioTrack("newsletter_submit", { source: data.source || null });
      var endpoint = cfg.NEWSLETTER_ENDPOINT;
      if (endpoint) {
        say("Subscribing…", "");
        if (button) button.disabled = true;
        fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(data)
        }).then(function (r) {
          if (!r.ok) throw new Error("HTTP " + r.status);
          nl.reset();
          window.ioTrack("newsletter_subscribed", { source: data.source || null });
          say("You're on the list. Unsubscribe anytime.", "ok");
        }).catch(function () {
          say('Something went wrong. <a href="' + lumaUrl + '" target="_blank" rel="noopener">Subscribe on Luma instead →</a>', "err");
        }).finally(function () { if (button) button.disabled = false; });
      } else {
        window.open(lumaUrl, "_blank", "noopener");
        say("Finish subscribing on Luma — it opened in a new tab.", "ok");
      }
    });
  });
});

// ---------- Reduced-motion video handling ----------
document.addEventListener("DOMContentLoaded", function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var v = document.getElementById("eventvideo");
    if (v) { v.removeAttribute("autoplay"); v.pause(); v.setAttribute("controls", ""); }
  }
});

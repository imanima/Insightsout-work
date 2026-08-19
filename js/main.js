// InsightsOut.work — shared behavior: analytics, booking, forms, video.

// ---------- Analytics (blueprint §13 event names) ----------
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

// ---------- Booking ----------
// Buttons carry data-book="coaching" | "org". If a booking URL is configured,
// open it; otherwise fall back to a pre-filled email so no lead is ever lost.
function bookingUrl(kind) {
  var c = window.IO_CONFIG || {};
  return kind === "org" ? c.BOOKING_URL_ORG : c.BOOKING_URL_COACHING;
}
document.addEventListener("click", function (e) {
  var el = e.target.closest("[data-book]");
  if (!el) return;
  e.preventDefault();
  var kind = el.getAttribute("data-book");
  window.ioTrack(kind === "org" ? "book_org_call_click" : "book_coaching_click");
  var url = bookingUrl(kind) || el.href;
  if (url) {
    window.open(url, "_blank", "noopener");
  } else {
    var subject = kind === "org"
      ? "Organization conversation | InsightsOut"
      : "Private coaching conversation | InsightsOut";
    var body = "Hi Nima,%0D%0A%0D%0AI would like to book a " +
      (kind === "org" ? "conversation for my organization." : "private coaching conversation.") +
      "%0D%0A%0D%0ATime 1:%0D%0ATime 2:%0D%0A%0D%0AThank you.";
    var contactEmail = (window.IO_CONFIG || {}).CONTACT_EMAIL || "nimani.coaching@gmail.com";
    window.location.href = "mailto:" + contactEmail +
      "?subject=" + encodeURIComponent(subject) + "&body=" + body;
  }
});

// Inline booking embed (coaching page): if a URL is configured, show the
// Google Calendar appointment page in an iframe; otherwise show fallback text.
document.addEventListener("DOMContentLoaded", function () {
  var mount = document.getElementById("booking-embed");
  if (!mount) return;
  var kind = mount.getAttribute("data-kind") || "coaching";
  var url = bookingUrl(kind);
  if (url) {
    // Google appointment pages only allow framing with gv=true appended
    if (url.indexOf("calendar.google.com/calendar/appointments") !== -1 && url.indexOf("gv=true") === -1) {
      url += (url.indexOf("?") === -1 ? "?" : "&") + "gv=true";
    }
    var iframe = document.createElement("iframe");
    iframe.src = url;
    iframe.title = "Book a call with Nima";
    iframe.loading = "lazy";
    mount.appendChild(iframe);
  } else {
    mount.style.display = "none";
    var fb = document.getElementById("booking-fallback");
    if (fb) fb.style.display = "block";
  }
});

// ---------- Cohort form ----------
document.addEventListener("DOMContentLoaded", function () {
  var form = document.getElementById("cohort-form");
  if (!form) return;
  var status = document.getElementById("cohort-form-status");

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var data = {};
    new FormData(form).forEach(function (v, k) { data[k] = v; });

    if (!data.name || !data.email) {
      status.textContent = "Please add your name and email so we can reach you.";
      status.className = "form-status err";
      return;
    }
    if (!data.consent) {
      status.textContent = "Please confirm that you want cohort and event updates.";
      status.className = "form-status err";
      return;
    }

    window.ioTrack("cohort_form_submit", { role: data.role || null });
    var endpoint = (window.IO_CONFIG || {}).FORM_ENDPOINT;

    if (endpoint) {
      status.textContent = "Sending…";
      status.className = "form-status";
      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data)
      }).then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        form.reset();
        status.textContent = "You are on the interest list. We will email you when dates are ready.";
        status.className = "form-status ok";
      }).catch(function () {
        status.textContent = "That didn't go through. Please try again, or email " +
          window.IO_CONFIG.CONTACT_EMAIL + " directly.";
        status.className = "form-status err";
      });
    } else {
      // Email fallback: opens a pre-filled message so the lead reaches Nima
      // even before a form backend is configured.
      var lines = [
        "Group coaching interest from insightsout.work", "",
        "Name: " + (data.name || ""),
        "Email: " + (data.email || ""),
        "What they are working through: " + (data.motivation || ""),
        "Consent to updates: " + (data.consent ? "yes" : "no")
      ];
      window.location.href = "mailto:" + window.IO_CONFIG.CONTACT_EMAIL +
        "?subject=" + encodeURIComponent("Group coaching waitlist: " + data.name) +
        "&body=" + encodeURIComponent(lines.join("\n"));
      status.textContent = "Your email app is opening with your details. Send the message to complete your application.";
      status.className = "form-status ok";
    }
  });
});

// ---------- Newsletter / subscribe ----------
// Every <form class="js-subscribe"> (and the legacy #newsletter-form) POSTs
// { email, source, consent } as JSON to IO_CONFIG.NEWSLETTER_ENDPOINT
// (/api/subscribe → Luma People list). Falls back to the Luma subscribe page.
document.addEventListener("DOMContentLoaded", function () {
  var forms = Array.prototype.slice.call(document.querySelectorAll("form.js-subscribe, form#newsletter-form"));
  if (!forms.length) return;
  var cfg = window.IO_CONFIG || {};
  var lumaUrl = cfg.LUMA_SUBSCRIBE_URL || cfg.LUMA_CALENDAR_URL || "https://luma.com/NimaImani";

  forms.forEach(function (nl) {
    var status = nl.querySelector(".form-status") || document.getElementById("newsletter-status");
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
      window.ioTrack("newsletter_submit", { interest: data.interest || null, source: data.source || null });
      var endpoint = cfg.NEWSLETTER_ENDPOINT;
      if (endpoint) {
        say("Subscribing\u2026", "");
        if (button) button.disabled = true;
        fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(data)
        }).then(function (r) {
          if (!r.ok) throw new Error("HTTP " + r.status);
          nl.reset();
          window.ioTrack("newsletter_subscribed", { source: data.source || null });
          say("You're on the list. You'll get event invites, field notes, and new programs \u2014 unsubscribe anytime.", "ok");
        }).catch(function () {
          say('Something went wrong. <a href="' + lumaUrl + '" target="_blank" rel="noopener">Subscribe on Luma instead \u2192</a>', "err");
        }).finally(function () { if (button) button.disabled = false; });
      } else {
        window.open(lumaUrl, "_blank", "noopener");
        say("Finish subscribing on Luma \u2014 it opened in a new tab.", "ok");
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

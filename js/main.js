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
  var url = bookingUrl(kind);
  if (url) {
    window.open(url, "_blank", "noopener");
  } else {
    var subject = kind === "org"
      ? "Organization discovery call — InsightsOut"
      : "Coaching discovery call — InsightsOut";
    var body = "Hi Nima,%0D%0A%0D%0AI'd like to book a " +
      (kind === "org" ? "discovery call for my organization." : "coaching discovery call.") +
      "%0D%0A%0D%0AA few times that work for me:%0D%0A- %0D%0A- %0D%0A%0D%0AThanks!";
    window.location.href = "mailto:" + (window.IO_CONFIG.CONTACT_EMAIL || "") +
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
        status.textContent = "You're in. Check your email for next steps — we'll be in touch soon.";
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
        "Cohort interest — submitted from insightsout.work", "",
        "Name: " + (data.name || ""),
        "Email: " + (data.email || ""),
        "Role / work context: " + (data.role || ""),
        "AI comfort level: " + (data.ai_comfort || ""),
        "What brings you: " + (data.motivation || ""),
        "Wants to build or lead: " + (data.build_goal || ""),
        "Schedule preference: " + (data.schedule || ""),
        "Interested in coaching too: " + (data.coaching_interest ? "yes" : "no"),
        "Consent to updates: " + (data.consent ? "yes" : "no")
      ];
      window.location.href = "mailto:" + window.IO_CONFIG.CONTACT_EMAIL +
        "?subject=" + encodeURIComponent("Join the Next Cohort — " + data.name) +
        "&body=" + encodeURIComponent(lines.join("\n"));
      status.textContent = "Opening your email app to send your details. (Connect a form backend in js/config.js to make this seamless.)";
      status.className = "form-status ok";
    }
  });
});

// ---------- Newsletter ----------
document.addEventListener("DOMContentLoaded", function () {
  var nl = document.getElementById("newsletter-form");
  if (!nl) return;
  nl.addEventListener("submit", function (e) {
    e.preventDefault();
    var email = nl.querySelector("input[type=email]").value;
    if (!email) return;
    window.ioTrack("newsletter_submit");
    var endpoint = (window.IO_CONFIG || {}).NEWSLETTER_ENDPOINT;
    var status = document.getElementById("newsletter-status");
    if (endpoint) {
      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email })
      }).then(function () {
        status.textContent = "Subscribed. Welcome.";
      }).catch(function () {
        status.textContent = "Something went wrong — try again?";
      });
    } else {
      window.location.href = "mailto:" + window.IO_CONFIG.CONTACT_EMAIL +
        "?subject=" + encodeURIComponent("Newsletter signup") +
        "&body=" + encodeURIComponent("Please add me to the newsletter: " + email);
      status.textContent = "Opening your email app to confirm.";
    }
  });
});

// ---------- Reduced-motion video handling ----------
document.addEventListener("DOMContentLoaded", function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var v = document.getElementById("eventvideo");
    if (v) { v.removeAttribute("autoplay"); v.pause(); v.setAttribute("controls", ""); }
  }
});

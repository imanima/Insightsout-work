// Renders upcoming events from data/events.json (generated from the Luma API
// by scripts/fetch_luma_events.py). Falls back to the public Luma calendar
// link if the file is missing or empty — embeds are never the only route.

(function () {
  function fmtDate(iso, tz) {
    var d = new Date(iso);
    var opts = { month: "short", day: "numeric", timeZone: tz || "America/Los_Angeles" };
    var wk = { weekday: "long", timeZone: tz || "America/Los_Angeles" };
    return {
      date: d.toLocaleDateString("en-US", opts),
      weekday: d.toLocaleDateString("en-US", wk),
      time: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz || "America/Los_Angeles" })
    };
  }

  function render(mount, events, limit) {
    var upcoming = events.filter(function (e) {
      return new Date(e.start_at) > new Date();
    }).slice(0, limit || 10);

    if (!upcoming.length) {
      mount.innerHTML = '<p class="events-empty">No upcoming events posted right now — new gatherings land every month. ' +
        '<a href="' + window.IO_CONFIG.LUMA_CALENDAR_URL + '" data-track="luma_rsvp_click">Follow the Luma calendar</a> to hear first.</p>';
      return;
    }

    mount.innerHTML = upcoming.map(function (e) {
      var f = fmtDate(e.start_at, e.timezone);
      var loc = e.location_type === "online" ? "Online" : "In person · San Francisco";
      return '<div class="event-card">' +
        '<div class="event-date">' + f.date + '<span>' + f.weekday + " · " + f.time + '</span></div>' +
        '<div><h3>' + e.name + '</h3>' +
        '<p>' + loc + (e.description ? " — " + e.description + "…" : "") + '</p></div>' +
        '<a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" data-track="luma_rsvp_click" href="' + e.url + '">RSVP on Luma</a>' +
        '</div>';
    }).join("");
  }

  document.addEventListener("DOMContentLoaded", function () {
    var mounts = document.querySelectorAll("[data-events]");
    if (!mounts.length) return;
    fetch("data/events.json")
      .then(function (r) { if (!r.ok) throw new Error("no events.json"); return r.json(); })
      .then(function (events) {
        mounts.forEach(function (m) {
          render(m, events, parseInt(m.getAttribute("data-events"), 10) || 10);
        });
      })
      .catch(function () {
        mounts.forEach(function (m) {
          m.innerHTML = '<p class="events-empty">See all upcoming gatherings on our ' +
            '<a href="' + window.IO_CONFIG.LUMA_CALENDAR_URL + '" data-track="luma_rsvp_click">Luma calendar</a>.</p>';
        });
      });
  });
})();

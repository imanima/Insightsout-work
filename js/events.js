// Fills event dates and Register links from /api/events (live Luma).
// If the request fails, the dates already in the HTML stay put.
// Guest/partner events (Agora, Redwood City, etc.) are skipped here;
// they still show in the Luma embed on the Events page.

(function () {
  "use strict";

  var TITLES = {
    "org-agents": "When Agents Join the Team",
    "org-lead": "How Do I Lead Through Change and Uncertainty?",
    "org-role": "When Your Role Starts Changing",
    everyone: "What Should Stay Human?"
  };

  function classify(name) {
    var n = String(name || "").trim();
    if (/group coaching/i.test(n) || /peer support for founders/i.test(n)) return "guest";
    if (/agents join the team/i.test(n)) return "org-agents";
    if (/how do i lead/i.test(n) || /team is overwhelmed/i.test(n)) return "org-lead";
    if (/role starts changing/i.test(n) || /the work changes/i.test(n)) return "org-role";
    if (/^what should stay human\??$/i.test(n)) return "everyone";
    return "guest";
  }

  function tzOf(e) {
    return e.timezone || "America/Los_Angeles";
  }

  function place(e) {
    var type = String(e.location_type || "");
    if (type === "online" || type === "virtual") return "Online";
    var addr = String(e.address || "");
    if (/zoom/i.test(addr)) return "Online";
    if (/laguna|commons/i.test(addr)) return "SF Commons";
    return addr.split(",")[0].trim() || "San Francisco";
  }

  function stripYear(s) {
    return String(s).replace(/,\s*\d{4}$/, "");
  }

  function shortDate(e) {
    return stripYear(new Date(e.start_at).toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "numeric", timeZone: tzOf(e)
    }));
  }

  function longDate(e) {
    return stripYear(new Date(e.start_at).toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", timeZone: tzOf(e)
    }));
  }

  function timeOf(e) {
    return new Date(e.start_at).toLocaleTimeString("en-US", {
      hour: "numeric", minute: "2-digit", timeZone: tzOf(e)
    });
  }

  function dateAttr(e) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tzOf(e), year: "numeric", month: "2-digit", day: "2-digit"
    }).format(new Date(e.start_at));
  }

  function monthDay(e) {
    return new Date(e.start_at).toLocaleDateString("en-US", {
      month: "short", day: "numeric", timeZone: tzOf(e)
    });
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function calendarUrl() {
    return (window.IO_CONFIG && window.IO_CONFIG.LUMA_CALENDAR_URL) || "https://luma.com/NimaImani";
  }

  function lumaUrl(slug) {
    if (!slug) return calendarUrl();
    if (/^https?:/i.test(slug)) return slug;
    return "https://luma.com/" + String(slug).replace(/^\//, "");
  }

  function prepare(raw) {
    var now = Date.now();
    return (raw || []).map(function (e) {
      var kind = classify(e.name);
      return {
        kind: kind,
        title: TITLES[kind] || e.name,
        start_at: e.start_at,
        timezone: tzOf(e),
        url: lumaUrl(e.url),
        place: place(e),
        location_type: e.location_type
      };
    }).filter(function (e) {
      return e.start_at && new Date(e.start_at).getTime() > now;
    }).sort(function (a, b) {
      return new Date(a.start_at) - new Date(b.start_at);
    });
  }

  function byKind(events, kind) {
    return events.filter(function (e) { return e.kind === kind; });
  }

  function uniqueKinds(events) {
    var seen = {};
    var out = [];
    events.forEach(function (e) {
      if (e.kind === "guest" || seen[e.kind]) return;
      seen[e.kind] = true;
      out.push(e);
    });
    return out;
  }

  function renderUpcoming(mount, events) {
    var list = uniqueKinds(events).slice(0, 5);
    if (!list.length) return;
    mount.innerHTML = list.map(function (e) {
      return '<a class="upcoming-row" href="' + esc(e.url) + '" target="_blank" rel="noopener" data-track="luma_rsvp_click">' +
        '<time datetime="' + esc(dateAttr(e)) + '">' + esc(shortDate(e)) + '</time>' +
        '<span class="upcoming-title">' + esc(e.title) + '</span>' +
        '<span class="upcoming-go">Register</span>' +
        '</a>';
    }).join("");
  }

  function whenLine(events, kind) {
    if (!events.length) return "Next date on Luma";
    var first = events[0];
    var line = longDate(first) + " · " + timeOf(first) + " · " + first.place;
    events.slice(1, 3).forEach(function (e) {
      line += " · Also " + longDate(e) + " · " + timeOf(e);
    });
    return line;
  }

  function linksHtml(events, leadingDot) {
    var html;
    if (!events.length) {
      html = '<a class="text-link" href="' + esc(calendarUrl()) + '" target="_blank" rel="noopener" data-track="luma_rsvp_click">See calendar &rarr;</a>';
    } else {
      html = events.slice(0, 3).map(function (e) {
        return '<a class="text-link" href="' + esc(e.url) + '" target="_blank" rel="noopener" data-track="luma_rsvp_click">Register ' + esc(monthDay(e)) + ' &rarr;</a>';
      }).join(" &nbsp;·&nbsp; ");
    }
    return leadingDot ? " &nbsp;·&nbsp; " + html : html;
  }

  function fillSeries(events) {
    document.querySelectorAll("[data-luma-kind]").forEach(function (article) {
      var kind = article.getAttribute("data-luma-kind");
      var series = byKind(events, kind);
      var when = article.querySelector("[data-luma-when]");
      var links = article.querySelector("[data-luma-links]");
      if (when) when.textContent = whenLine(series, kind);
      if (links) links.innerHTML = linksHtml(series, links.tagName !== "P");
    });
  }

  function fillRegisters(events) {
    document.querySelectorAll("[data-luma-register]").forEach(function (a) {
      var series = byKind(events, a.getAttribute("data-luma-register"));
      a.href = series.length ? series[0].url : calendarUrl();
    });
  }

  function fillNext(events) {
    document.querySelectorAll("[data-luma-next]").forEach(function (el) {
      var series = byKind(events, el.getAttribute("data-luma-next"));
      if (!series.length) {
        el.innerHTML = 'Not on the calendar yet. Watch <a href="' + esc(calendarUrl()) + '" target="_blank" rel="noopener" data-track="luma_rsvp_click">Luma</a>.';
        return;
      }
      var e = series[0];
      el.innerHTML = esc(longDate(e)) + ", " + esc(timeOf(e)) +
        ' (<a href="' + esc(e.url) + '" target="_blank" rel="noopener" data-track="luma_rsvp_click">register</a>)';
    });
  }

  function needed() {
    return document.querySelector("[data-upcoming], [data-luma-kind], [data-luma-register], [data-luma-next]");
  }

  function apply(events) {
    var upcoming = document.querySelector("[data-upcoming]");
    if (upcoming) renderUpcoming(upcoming, events);
    fillSeries(events);
    fillRegisters(events);
    fillNext(events);
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!needed()) return;
    var api = (window.IO_CONFIG && window.IO_CONFIG.EVENTS_API) || "/api/events";
    fetch(api)
      .then(function (r) { if (!r.ok) throw new Error("no events api"); return r.json(); })
      .then(function (data) {
        var list = prepare(data.events || []);
        if (!list.length) return;
        apply(list);
      })
      .catch(function () { /* keep the dates already in the HTML */ });
  });
})();

(function () {
  "use strict";

  // Paths are relative to the page; pages in /research/ set data-research-root="../".
  var root = document.documentElement.getAttribute("data-research-root") || "";
  var FINDINGS = root + "data/findings.json";
  var MANIFEST = root + "data/research.json";

  function text(el, value) { if (value !== undefined && value !== null && value !== "") el.textContent = value; }

  function get(obj, path) {
    return path.split(".").reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj);
  }

  // 1) Fill numbers: <span data-finding="H5.trust_gap">…</span>
  //    optional data-field="stat.detail" | "stat.n" | "claim" | "anchor.source" (default stat.value)
  fetch(FINDINGS)
    .then(function (r) { if (!r.ok) throw new Error("findings"); return r.json(); })
    .then(function (ledger) {
      var byId = {};
      (ledger.findings || []).forEach(function (f) { byId[f.id] = f; });

      document.querySelectorAll("[data-finding]").forEach(function (el) {
        var f = byId[el.getAttribute("data-finding")];
        if (!f) { el.classList.add("finding-missing"); return; }
        var field = el.getAttribute("data-field") || "stat.value";
        text(el, get(f, field));
        if (f.status === "candidate") el.classList.add("finding-candidate");
      });

      document.querySelectorAll("[data-dataset]").forEach(function (el) {
        text(el, get(ledger.dataset || {}, el.getAttribute("data-dataset")));
      });

      // Optional: full finding cards <div data-finding-card="H5.trust_gap"></div>
      document.querySelectorAll("[data-finding-card]").forEach(function (el) {
        var f = byId[el.getAttribute("data-finding-card")];
        if (!f) return;
        var anchor = f.anchor && f.anchor.source
          ? '<p class="method-note">' + (f.anchor.relationship ? "<strong>" + f.anchor.relationship.charAt(0).toUpperCase() + f.anchor.relationship.slice(1) + "</strong> " : "") +
            (f.anchor.url ? '<a href="' + f.anchor.url + '" target="_blank" rel="noopener">' + f.anchor.source + "</a>" : f.anchor.source) +
            (f.anchor.note ? " — " + f.anchor.note : "") + "</p>"
          : "";
        el.innerHTML =
          '<div class="research-stat"><strong>' + f.stat.value + "</strong><span>" + (f.stat.detail || "") + " · n=" + f.stat.n + "</span></div>" +
          "<p>" + f.claim + "</p>" + anchor;
      });
    })
    .catch(function () {
      document.querySelectorAll("[data-finding]").forEach(function (el) { el.classList.add("finding-missing"); });
    });

  // 2) Render publication list: <div class="article-list" data-research-list [data-types="white-paper,brief"]></div>
  var mounts = document.querySelectorAll("[data-research-list]");
  var metas = document.querySelectorAll("[data-paper-meta]");
  if (!mounts.length && !metas.length) return;

  fetch(MANIFEST)
    .then(function (r) { if (!r.ok) throw new Error("manifest"); return r.json(); })
    .then(function (manifest) {
      var pubs = (manifest.publications || []).filter(function (p) { return p.status !== "draft"; });

      mounts.forEach(function (mount) {
        var types = (mount.getAttribute("data-types") || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean);
        var list = types.length ? pubs.filter(function (p) { return types.indexOf(p.type) !== -1; }) : pubs;
        list.sort(function (a, b) { return ((b.weight || 0) - (a.weight || 0)) || (b.date || "").localeCompare(a.date || ""); });
        mount.innerHTML = list.map(function (p) {
          var meta = [p.version ? "v" + p.version : "", p.date || "", p.n ? "n=" + p.n : ""].filter(Boolean).join(" · ");
          return '<a class="article-card article-live" href="' + root + p.url + '">' +
            "<div>" +
              '<span class="article-type">' + (p.type_label || p.type) + (meta ? " · " + meta : "") + "</span>" +
              "<h3>" + p.title + "</h3>" +
              "<p>" + (p.summary || "") + "</p>" +
            "</div>" +
            '<span class="article-link">Read →</span>' +
          "</a>";
        }).join("");
      });

      // <span data-paper-meta="version" data-slug="working-through-ai-change"></span>
      metas.forEach(function (el) {
        var slug = el.getAttribute("data-slug");
        var p = pubs.filter(function (x) { return x.slug === slug; })[0];
        if (p) text(el, get(p, el.getAttribute("data-paper-meta")));
      });
    })
    .catch(function () {
      mounts.forEach(function (m) { m.innerHTML = '<p class="method-note">Research list is temporarily unavailable.</p>'; });
    });
}());

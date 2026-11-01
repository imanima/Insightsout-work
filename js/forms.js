// Native forms for reviews and introductions. Opens a dialog in the site's own
// style, posts to /api/inbox, and falls back to the Tally link if the inbox is
// not configured. Markup lives here so every page shows the same form.
(function () {
  var ENDPOINT = "/api/inbox";
  var FALLBACK = { review: "https://tally.so/r/OQDlWM", introduce: "https://tally.so/r/QoKeLg" };

  function field(label, inner, hint) {
    return '<label class="io-field"><span class="io-label">' + label + (hint ? ' <em>' + hint + '</em>' : '') + '</span>' + inner + '</label>';
  }
  function input(name, type, placeholder, required) {
    return '<input class="io-input" name="' + name + '" type="' + (type || "text") + '"' + (placeholder ? ' placeholder="' + placeholder + '"' : '') + (required ? ' required' : '') + (type === "email" ? ' autocomplete="email"' : '') + (name === "name" ? ' autocomplete="name"' : '') + '>';
  }
  function choices(name, opts, required) {
    return '<div class="io-choices">' + opts.map(function (o, i) {
      return '<label class="io-choice"><input type="radio" name="' + name + '" value="' + o[0] + '"' + (required && i === 0 ? ' required' : '') + '><span>' + o[1] + '</span></label>';
    }).join("") + '</div>';
  }

  var FORMS = {
    review: {
      title: "A few words about working with Nima",
      intro: "Two minutes, in your own words. Nothing is published without your permission.",
      submit: "Send",
      thanks: "Thank you. I will read this myself and only use it the way you chose.",
      body: field("Your name", input("name", "text", "", true)) +
        field("Your role and where you work", input("role", "text", "Product lead at a health company, or founder of a small studio", true), "or what you are building") +
        field("What did we do together?", choices("program", [["group", "Group coaching"], ["coaching", "Private 1:1 coaching"], ["workshop", "A workshop"], ["organization", "Work inside my organization"]], true)) +
        field("A few words, in your own voice", '<textarea class="io-input io-textarea" name="words" rows="5" required placeholder="What you were carrying when you came in, what changed, and who you would send to this. Three or four sentences is plenty."></textarea>') +
        field("How may I use your words?", choices("permission", [["name", "Quote me with my name and role"], ["first", "Quote me with my first name and role only"], ["anon", "Quote me without a name"], ["private", "Keep it private, just for Nima"]], true)) +
        '<label class="io-check"><input type="checkbox" name="linkedin_ok" value="yes"><span>I am happy to post this as a recommendation on LinkedIn too. Send me the link.</span></label>' +
        field("Your email", input("email", "email", "", true), "so I can say thank you")
    },
    introduce: {
      title: "Introduce someone to Nima",
      intro: "One name is plenty. I will reach out gently, and I will not mention you unless you say I can.",
      submit: "Send",
      thanks: "Thank you. I will reach out within a week, gently, and I will let you know whether it helped.",
      body: field("Your name", input("name", "text", "", true)) +
        field("Your email", input("email", "email", "", true)) +
        field("Who are you thinking of?", input("their_name", "text", "Their name", true)) +
        field("What are they carrying right now?", '<textarea class="io-input io-textarea" name="situation" rows="3" required placeholder="One or two lines is enough: a decision, a role that is changing, a team, something they are building"></textarea>') +
        field("Best way to reach them", input("reach", "text", "Email or LinkedIn, or: I would rather send them your note myself"), "optional") +
        field("May I say that you suggested it?", choices("mention", [["yes", "Yes, you can mention me"], ["no", "No, keep me out of it"]], true))
    }
  };

  function build(kind) {
    var spec = FORMS[kind];
    var dlg = document.createElement("dialog");
    dlg.className = "io-modal";
    dlg.innerHTML =
      '<form class="io-form" method="dialog" novalidate>' +
      '<button type="button" class="io-close" aria-label="Close">&times;</button>' +
      '<h2 class="io-title">' + spec.title + '</h2>' +
      '<p class="io-intro">' + spec.intro + '</p>' +
      '<div class="io-fields">' + spec.body + '</div>' +
      '<input class="io-hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<p class="io-status" aria-live="polite"></p>' +
      '<div class="io-actions"><button type="submit" class="btn btn-primary">' + spec.submit + '</button><span class="io-note">Nothing is shared without your permission.</span></div>' +
      '</form>' +
      '<div class="io-thanks" hidden><h2 class="io-title">Thank you.</h2><p>' + spec.thanks + '</p><button type="button" class="btn btn-ghost io-close">Close</button></div>';
    document.body.appendChild(dlg);
    var form = dlg.querySelector("form");
    var status = dlg.querySelector(".io-status");
    dlg.querySelectorAll(".io-close").forEach(function (b) { b.addEventListener("click", function () { dlg.close(); }); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var payload = { kind: kind, source: dlg.dataset.source || "", page: location.pathname };
      new FormData(form).forEach(function (v, k) { payload[k] = v; });
      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true; status.textContent = "Sending...";
      fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        .then(function (r) { return r.json().then(function (j) { return { status: r.status, body: j }; }); })
        .then(function (r) {
          if (r.body && r.body.ok) {
            form.hidden = true; dlg.querySelector(".io-thanks").hidden = false;
            if (window.ioTrack) window.ioTrack(kind + "_sent", { source: payload.source });
            return;
          }
          var err = (r.body && r.body.error) || "";
          if (err === "server_not_configured" || err === "inbox_unavailable" || r.status >= 500) {
            status.innerHTML = 'This did not go through. <a href="' + FALLBACK[kind] + '?source=' + encodeURIComponent(payload.source || "site") + '" target="_blank" rel="noopener">Open the form in a new tab</a> instead.';
          } else {
            status.textContent = "Please check the highlighted fields and try again.";
          }
          btn.disabled = false;
        })
        .catch(function () {
          status.innerHTML = 'This did not go through. <a href="' + FALLBACK[kind] + '" target="_blank" rel="noopener">Open the form in a new tab</a> instead.';
          btn.disabled = false;
        });
    });
    return dlg;
  }

  var cache = {};
  document.addEventListener("click", function (e) {
    var a = e.target.closest("[data-io-form]");
    if (!a) return;
    var kind = a.getAttribute("data-io-form");
    if (!FORMS[kind] || typeof HTMLDialogElement === "undefined") return; // old browser: follow the link
    e.preventDefault();
    var dlg = cache[kind] || (cache[kind] = build(kind));
    dlg.dataset.source = a.getAttribute("data-source") || "";
    dlg.showModal();
    var first = dlg.querySelector(".io-input");
    if (first) first.focus();
  });
})();

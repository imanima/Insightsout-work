(function () {
  "use strict";

  var source = document.documentElement.getAttribute("data-events-source") || "data/events.json";

  function setStat(name, value) {
    document.querySelectorAll("[data-event-stat='" + name + "']").forEach(function (el) {
      el.textContent = value;
    });
  }

  function titleIncludes(event, word) {
    return (event.name || "").toLowerCase().indexOf(word) !== -1;
  }

  fetch(source)
    .then(function (response) {
      if (!response.ok) throw new Error("Unable to load event records");
      return response.json();
    })
    .then(function (events) {
      var current = events.filter(function (event) {
        return (event.start_at || "").indexOf("2026") === 0;
      });

      setStat("total", current.length);
      setStat("in_person", current.filter(function (event) { return event.location_type === "in_person"; }).length);
      setStat("online", current.filter(function (event) { return event.location_type === "online"; }).length);
      setStat("founder", current.filter(function (event) { return titleIncludes(event, "founder"); }).length);
      setStat("emotion", current.filter(function (event) { return titleIncludes(event, "emotion"); }).length);
      setStat("overwhelm", current.filter(function (event) { return titleIncludes(event, "overwhelm"); }).length);
      setStat("role", current.filter(function (event) { return titleIncludes(event, "role"); }).length);

      document.querySelectorAll("[data-event-data-status]").forEach(function (el) {
        el.textContent = "Calculated from the public InsightsOut event record.";
      });
    })
    .catch(function () {
      document.querySelectorAll("[data-event-data-status]").forEach(function (el) {
        el.textContent = "Event data is temporarily unavailable.";
      });
    });
}());

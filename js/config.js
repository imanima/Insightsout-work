// ============================================================
// InsightsOut.work — site configuration
// This is the ONE file to edit when connecting real services.
// ============================================================
window.IO_CONFIG = {
  // --- Booking ---
  // One booking link for the whole site ("Book a call").
  BOOKING_URL: "https://calendar.app.google/M92FKMrjr3zqA57x8",

  // --- Contact ---
  CONTACT_EMAIL: "nima@insightsout.work",

  // --- Luma ---
  // The events page uses the official calendar embed (cal-cHPs3Da3iGJZspe)
  // directly in the HTML, so newly published events appear automatically.
  // This is the public non-embed fallback link.
  LUMA_CALENDAR_URL: "https://luma.com/NimaImani",

  // --- Newsletter / subscribers ---
  // No signup form is on the site right now. When one returns, every
  // <form class="js-subscribe"> POSTs JSON to this endpoint (api/subscribe.js,
  // which adds the person to the Luma People list using LUMA_API_KEY in Vercel).
  NEWSLETTER_ENDPOINT: "/api/subscribe",
  // Public subscribe page on Luma (fallback link shown if the API call fails).
  LUMA_SUBSCRIBE_URL: "https://luma.com/NimaImani"
};

// ============================================================
// InsightsOut.work — site configuration
// This is the ONE file to edit when connecting real services.
// ============================================================
window.IO_CONFIG = {
  // --- Booking ---
  // Private coaching books through Nima's free 30-minute call schedule.
  BOOKING_URL_COACHING: "https://calendar.app.google/wpqVkuaH1uwFRh6cA",
  // Discovery calls (organizations + general) book through Google Calendar.
  BOOKING_URL_ORG: "https://calendar.app.google/8y9NgWzBLaiT414G6",

  // --- Cohort form backend ---
  // Leave empty to use the email fallback (opens a pre-filled email).
  // For a hosted form backend, paste a Formspree/Tally/Fillout endpoint,
  // e.g. "https://formspree.io/f/xxxxxxx" — the form will POST JSON to it.
  FORM_ENDPOINT: "",

  // --- Contact ---
  CONTACT_EMAIL: "nimani.coaching@gmail.com",

  // --- Luma ---
  // The events page uses the official calendar embed (cal-cHPs3Da3iGJZspe)
  // directly in the HTML, so newly published events appear automatically.
  // This is the public non-embed fallback link.
  LUMA_CALENDAR_URL: "https://lu.ma/user/nimaimani",

  // --- Newsletter / subscribers ---
  // Subscribers live in the Luma calendar (People list). The site form POSTs
  // JSON to /api/subscribe (Vercel function, api/subscribe.js), which calls the
  // Luma API with the LUMA_API_KEY environment variable set in Vercel.
  // To move to an email provider later (Kit/MailerLite), point this at their
  // form endpoint — the form already sends { email, source }.
  NEWSLETTER_ENDPOINT: "/api/subscribe",
  // Public subscribe page on Luma (fallback link shown if the API call fails).
  LUMA_SUBSCRIBE_URL: "https://luma.com/NimaImani"
};

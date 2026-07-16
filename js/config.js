// ============================================================
// InsightsOut.work — site configuration
// This is the ONE file to edit when connecting real services.
// ============================================================
window.IO_CONFIG = {
  // --- Booking ---
  // Private coaching books directly through Nima's Google Calendar.
  BOOKING_URL_COACHING: "https://calendar.app.google/8y9NgWzBLaiT414G6",
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
  // The events pages use the official calendar embed (cal-cHPs3Da3iGJZspe)
  // directly in the HTML. This URL is the non-embed fallback link.
  LUMA_CALENDAR_URL: "https://luma.com/embed/calendar/cal-cHPs3Da3iGJZspe/events",

  // --- Newsletter ---
  // Paste a provider form action URL (Buttondown/ConvertKit/Mailchimp) when ready.
  NEWSLETTER_ENDPOINT: ""
};

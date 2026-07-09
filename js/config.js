// ============================================================
// InsightsOut.work — site configuration
// This is the ONE file to edit when connecting real services.
// ============================================================
window.IO_CONFIG = {
  // --- Booking (Google Calendar appointment schedules) ---
  // In Google Calendar: Create > Appointment schedule > Share > copy the
  // booking page link, then paste it here. Two schedules recommended:
  // one for coaching discovery calls, one for organization calls.
  // Example: "https://calendar.google.com/calendar/appointments/schedules/AcZs..."
  BOOKING_URL_COACHING: "",
  BOOKING_URL_ORG: "",

  // --- Cohort form backend ---
  // Leave empty to use the email fallback (opens a pre-filled email).
  // For a hosted form backend, paste a Formspree/Tally/Fillout endpoint,
  // e.g. "https://formspree.io/f/xxxxxxx" — the form will POST JSON to it.
  FORM_ENDPOINT: "",

  // --- Contact ---
  CONTACT_EMAIL: "imani.nima@gmail.com",

  // --- Luma ---
  // Public Luma calendar page (used as the "see everything" fallback link).
  LUMA_CALENDAR_URL: "https://lu.ma/user/nimaimani",

  // --- Newsletter ---
  // Paste a provider form action URL (Buttondown/ConvertKit/Mailchimp) when ready.
  NEWSLETTER_ENDPOINT: ""
};

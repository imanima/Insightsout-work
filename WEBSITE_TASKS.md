# InsightsOut website tasks

## Needs an account or content decision

- Connect `NEWSLETTER_ENDPOINT` in `js/config.js` to Buttondown, Kit, Mailchimp, or another email provider. This is the highest-priority growth task.
- Connect `FORM_ENDPOINT` if the cohort interest form will be used again. Until then it opens a pre-filled email.
- Choose an analytics provider (Plausible or PostHog), add its site key, and verify the events already emitted by `js/main.js`.
- Refresh `data/events.json` after new Luma events when the research record or event statistics need updating. The Community page itself uses the live Luma embed and updates automatically.
- Collect one or two short, permissioned participant or client quotes for Home and Organizations. Do not add anonymous or invented testimonials.

## Coaching (added 2026-08-17)

- Coaching page is now indexed and in the global nav; two programs with prices are live on `coaching.html#offers`.
- Add Stripe payment links to the two program cards when created (currently both CTAs go to the free 30-min call).
- Confirm the Friday group Luma link on `coaching.html` (`https://luma.com/NimaImani`).

## Lower priority

- Move the remaining one-off inline presentation styles into `css/style.css`.
- Review the event-record article after each data refresh so its claims and counts stay current.

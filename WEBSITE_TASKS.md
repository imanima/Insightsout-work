# InsightsOut website tasks

## Needs an account or content decision

- Connect `NEWSLETTER_ENDPOINT` in `js/config.js` to Buttondown, Kit, Mailchimp, or another email provider. This is the highest-priority growth task.
- Connect `FORM_ENDPOINT` if the cohort interest form will be used again. Until then it opens a pre-filled email.
- Choose an analytics provider (Plausible or PostHog), add its site key, and verify the events already emitted by `js/main.js`.
- Refresh `data/events.json` after new Luma events when the research record or event statistics need updating. The Community page itself uses the live Luma embed and updates automatically.
- Collect one or two short, permissioned participant or client quotes for Home and Organizations. Do not add anonymous or invented testimonials.

## Lower priority

- Move the remaining one-off inline presentation styles into `css/style.css`.
- Review the event-record article after each data refresh so its claims and counts stay current.

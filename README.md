# InsightsOut.work

Static site for **InsightsOut — Human leadership for the age of AI**.
No build step: plain HTML/CSS/JS, deployable as-is to Vercel, Netlify, or any static host.

## Run locally

```bash
python3 -m http.server 8642
# open http://localhost:8642
```

(Serving over HTTP matters — the Luma iframe and `fetch()` calls don't run from `file://`.)

## Connect real services — edit `js/config.js`

| Setting | What to paste | Where to get it |
|---|---|---|
| `BOOKING_URL_COACHING` | Google Calendar appointment-schedule booking link | Google Calendar → Create → Appointment schedule → Share |
| `BOOKING_URL_ORG` | Second schedule for organization calls | same |
| `FORM_ENDPOINT` | Formspree/Tally/Fillout endpoint URL | e.g. formspree.io — form POSTs JSON |
| `NEWSLETTER_ENDPOINT` | Newsletter provider endpoint | Buttondown/ConvertKit/Mailchimp |

**Fallbacks are built in** — until these are configured, every CTA still works:
booking buttons open a pre-filled email, the cohort form opens a pre-filled email,
so no lead is ever dropped.

## Events (Luma)

Events display through the official Luma calendar embed
(`https://luma.com/embed/calendar/cal-cHPs3Da3iGJZspe/events`) on the Home and
Events pages — always current, zero maintenance.

For custom-branded event cards later (blueprint Phase 2), the plumbing already
exists: `scripts/fetch_luma_events.py` writes `data/events.json` from the Luma
API, and `js/events.js` renders it into any `<div data-events="N">` mount.

```bash
set -a; source "../Luma data reader/.env"; set +a
python3 scripts/fetch_luma_events.py
```

## Analytics

`js/main.js` defines `window.ioTrack()` and fires the blueprint §13 event names
(`cta_join_cohort_click`, `luma_rsvp_click`, `cohort_form_submit`,
`book_coaching_click`, `book_org_call_click`, `newsletter_submit`). Events go to
`window.dataLayer` now; adding a Plausible or PostHog snippet picks them up
automatically.

## Content notes

- Insights topic chips mirror the research-engine Topic taxonomy
  (see `IMPLEMENTATION_PLAN.md` in the Luma data reader repo §3) so published
  articles land in matching categories.
- No fabricated testimonials — add a TestimonialCard section once real quotes exist.
- Photos: confirm all event photos are approved for public use before deploying.

## Deploy

Point Vercel/Netlify at this repo (branch `site-mvp`), no build command, output
directory `/`. Then set the domain to `insightsout.work` and update the
`canonical`/`og:` URLs if the domain differs.

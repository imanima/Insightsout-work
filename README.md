# InsightsOut.work

Static site for **InsightsOut — helping people and teams find their way through rapid change**.
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
(`https://luma.com/embed/calendar/cal-cHPs3Da3iGJZspe/events`) on the Events
page so registration stays current without duplicating event details.

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

## Research and articles

`insights.html` is the research hub. `js/research.js` calculates transparent
event record statistics from `data/events.json`. The first field note lives at
`articles/event-record-2026.html` and clearly separates calendar records from
participant outcomes.

Participant findings should only be added after optional anonymous responses
have been collected in sufficient numbers. The current publishing threshold is
10 responses.

## Content notes

- Research currently focuses on role change, overwhelm and agency, and
  responsible AI adoption.
- No fabricated testimonials — add a TestimonialCard section once real quotes exist.
- Photos: confirm all event photos are approved for public use before deploying.

## Deploy

Point Vercel/Netlify at this repo (branch `site-mvp`), no build command, output
directory `/`. Then set the domain to `insightsout.work` and update the
`canonical`/`og:` URLs if the domain differs.

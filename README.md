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
| `NEWSLETTER_ENDPOINT` | `/api/subscribe` (default) — Vercel function that adds the email to the Luma calendar People list | Set `LUMA_API_KEY` in Vercel → Project → Settings → Environment Variables (key from luma.com/calendar/manage/api-keys, needs Luma Plus). To move to Kit/MailerLite later, paste their form endpoint here. |

**Fallbacks are built in** — until these are configured, every CTA still works:
booking buttons open a pre-filled email, the cohort form opens a pre-filled email,
so no lead is ever dropped.

## Subscribers (Luma)

Subscribers live in the Luma calendar (People list) — the same list that gets
event invites. Every `form.js-subscribe` on the site (Home, Community,
Coaching, Research) POSTs `{ email, source }` to `/api/subscribe`
(`api/subscribe.js`), which calls Luma's `import-people` API and tags the
person with the page source (`home`, `community`, `coaching`, `research`).
Create those four tags once in Luma → People → Tags; if a tag is missing the
function retries untagged so no subscriber is lost. Newsletters are sent from
Luma (People → Newsletter) — 5,000 sends/week on Plus, so send by tag or add
the 10k pack for full-list sends. Migration path to an email provider is in
`AGENT-GROWTH-PLAYBOOK.md`.

Local test: `LUMA_API_KEY=... vercel dev` (or `npx vercel dev`).

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

## The Signal, articles, and field reports

`insights.html` is the writing and subscription hub. It separates InsightsOut
perspective essays from evidence-based field notes. `js/research.js` calculates
transparent event record statistics from `data/events.json`; the event-record
article clearly separates calendar records from participant outcomes.

Participant findings should only be added after optional anonymous responses
have been collected in sufficient numbers. The current publishing threshold is
10 responses. Every report should name its source, method, sample size, and
limits.

## Content notes

- Research currently focuses on role change, overwhelm and agency, and
  responsible AI adoption.
- No fabricated testimonials — add a TestimonialCard section once real quotes exist.
- Photos: confirm all event photos are approved for public use before deploying.

## Deploy

Point Vercel/Netlify at this repo (branch `site-mvp`), no build command, output
directory `/`. Then set the domain to `insightsout.work` and update the
`canonical`/`og:` URLs if the domain differs.

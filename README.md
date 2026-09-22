# InsightsOut.work

Static site for **InsightsOut — the human side of AI change**. Plain HTML/CSS/JS, no build step, deployed as-is on Vercel from `main`.

## Run locally

```bash
python3 -m http.server 8642
# open http://localhost:8642
```

Serve over HTTP: the Luma iframe and the `fetch()` calls don't run from `file://`.

## Site map

Five top pages: Home · Organizations · Founders (`coaching.html`) · Events · About.
One level down: `workshops/`, `research/`, `articles/`, and `insights.html` (the research hub, linked from the footer).
`answers.html` stays live for search engines and AI assistants but is not linked from the nav.

One button on the whole site: **Book a call**, one link, set in `js/config.js` (`BOOKING_URL`) and hard-coded in each page's header.

## Events and dates

Dates are written into the HTML (Home strip, Events page, each workshop page). Two rules keep them honest:

- Every dated row carries `data-event-date="YYYY-MM-DD"`. `js/main.js` hides it once the day has passed (Pacific time), and a container with `data-event-list` shows its `[data-event-empty]` child when nothing is left. A page can go stale in text, but never advertises a past date.
- The Luma calendar embed on the Events page is the live source; new events appear there without a deploy.

The weekly sync agent (runs on Nima's machine, token in `.git-push-token`, gitignored) updates dates in the HTML and, optionally, `data/events.json` via `scripts/fetch_luma_events.py`. Add the `data-event-date` attribute to any new dated row it writes.

## Redirects

`vercel.json` (`cleanUrls: true`). Retired URLs 301 to their replacement: `/ai-transformation` and `/ai-enablement` → `/events`, `/workshops/ai-for-the-rest-of-us` → `/workshops/what-should-stay-human`, older `/cohort`, `/leadership-circle`, `/partnerships` → the matching door.

## Subscribers

There is no signup form on the site right now. `api/subscribe.js` (Vercel function adding an email to the Luma People list via `LUMA_API_KEY`) and the `form.js-subscribe` handler in `js/main.js` are kept so a form can return without new plumbing.

## Research

`insights.html` is the hub. `research-src/` holds the paper sources and the operator guide (`research-src/README.md`); `scripts/build_research.py` renders `research/*.html`. Numbers live in `data/findings.json` and are filled in by `js/findings.js`. The event-record article reads `data/events.json` via `js/research.js`.

## Analytics

`js/main.js` defines `window.ioTrack()` and fires `book_call_click`, `luma_rsvp_click`, and `newsletter_submit` into `window.dataLayer`; a Plausible or PostHog snippet picks them up automatically.

## Content notes

- Workshops are at SF Commons, San Francisco: 540 Laguna St (540 Cafe) for most, 550 Laguna St (North Studio / Full Studio) for the Friday founder group and When Your Role Starts Changing. Some run on Zoom.
- Testimonials on the Founders page are real quotes; add more only with permission.
- Confirm event photos are approved for public use before adding them.

# InsightsOut.work

Static site for **InsightsOut — the human side of AI change**. Plain HTML/CSS/JS, no build step, deployed as-is on Vercel from `main`.

## Run locally

```bash
python3 -m http.server 8642
# open http://localhost:8642
```

Serve over HTTP: the Luma iframe and the `fetch()` calls don't run from `file://`.

## Site map

The home page is the one page: work for organizations, private 1:1 coaching (three ways in), The InsightsOut Cohort starting January 2027 and the public rooms that lead into it, upcoming dates, and the free 30 minute call. Everything else is detail behind it.

Nav: Organizations · 1:1 Coaching · Cohorts · Small Business (`small-business.html`) · About. Also live but not in the nav: `events.html` (Workshops, linked from Home and the footer), `insights.html` (Research), `answers.html` (for search engines and AI assistants), `company-pay.html`.
One level down: `workshops/` (one page per series), `research/` (living papers), `articles/`.

Recurring series, same title everywhere (site, Luma, email, LinkedIn): Founder Group Coaching & Peer Support (every Friday), Building on the Side (Fridays, for working professionals), When Your Role Starts Changing, When Agents Join the Team, What Should Stay Human?, How Do I Lead Through Change and Uncertainty? (`my-team-is-overwhelmed.html`). Dates are instances of a series: they fill live from Luma through `/api/events`; the HTML carries a static fallback.

Two booking links, by audience: the free 30 minute coaching call (`data-book="coaching"`) on Home, Coaching, Cohorts, Company-pay; the leadership conversation (`data-book="org"`) on Organizations, Research, and the Agents workshop. No other calendar link exists on the site.

## Events and dates

Dates are written into the HTML (Home strip, Events page, each workshop page). Two rules keep them honest:

- Every dated row carries `data-event-date="YYYY-MM-DD"`. `js/main.js` hides it once the day has passed (Pacific time), and a container with `data-event-list` shows its `[data-event-empty]` child when nothing is left. A page can go stale in text, but never advertises a past date.
- The Luma calendar embed on the Events page is the live source; new events appear there without a deploy.

`scripts/luma_update_events.py` (dry run by default, `--apply` to write) renames and re-describes the Luma events to match the four series; it needs `LUMA_API_KEY` and network access to public-api.luma.com, which this cloud session does not have.

The weekly sync agent (runs on Nima's machine, token in `.git-push-token`, gitignored) updates dates in the HTML and, optionally, `data/events.json` via `scripts/fetch_luma_events.py`. Add the `data-event-date` attribute to any new dated row it writes.

## Redirects

`vercel.json` (`cleanUrls: true`). Retired URLs 301 to their replacement: `/start` and `/ai-transformation` → `/` or `/organizations`, `/what-should-stay-human` → `/workshops/what-should-stay-human`, `/workshops/when-the-work-changes` → `/workshops/when-your-role-starts-changing`, the retired workshops (`ai-for-the-rest-of-us`, `navigating-uncertainty-at-work`, `the-argument-you-keep-having`, `you-cant-wait-for-certainty`) → `/events`, older `/cohort`, `/leadership-circle`, `/partnerships`, `/ai-enablement` → the matching door.

## Keeping it in sync

Start with `CLAUDE.md` (rules for any agent session) and `OPERATIONS.md` (what lives where). `data/site.json` is the one source of truth for names and links; `scripts/check_site.py` must pass before every push and runs in CI every Monday.

## Hosting and hygiene

- `vercel.json` sets security headers on every route (nosniff, referrer policy, frame options, permissions policy), a one-year immutable cache on `/assets/*` (assets are versioned by filename or `?v=`), and no trailing slashes. `404.html` is the branded not-found page.
- Every page has a skip link to `#main`, an SVG favicon plus PNG fallbacks and an Apple touch icon under `/assets/`, and a `theme-color`.
- The home page's social preview is `assets/og-home.png` (1200x630). Regenerate it from the slide styles if the headline changes.
- `css/style.css` is purged of unused rules; when you add a class in HTML or JS, add its CSS too. A layout regression check (page heights and element boxes on desktop and mobile) lives in the session scratch scripts, not in the repo.
- `slides/keep-going.html` is the end-of-workshop slide with QR codes (next room, cohorts, free call); `keep-going.png` and `.pdf` are the exports for decks.

## Subscribers

The newsletter is **What Should Stay Human** on Substack. Every `<div data-newsletter>` (Home, Events) renders a subscribe form once `NEWSLETTER_URL` in `js/config.js` holds the publication URL; the form opens Substack's own subscribe page with the email prefilled. While the value is empty the block shows a link to the Luma calendar instead, so the site never shows a form that cannot deliver. `api/subscribe.js` (Luma People list via `LUMA_API_KEY`) and the `form.js-subscribe` handler are kept as a fallback path.

## Research

`insights.html` is the hub. `research-src/` holds the paper sources and the operator guide (`research-src/README.md`); `scripts/build_research.py` renders `research/*.html`. Numbers live in `data/findings.json` and are filled in by `js/findings.js`. The event-record article reads `data/events.json` via `js/research.js`.

## Analytics

`js/main.js` defines `window.ioTrack()` and fires `book_call_click`, `luma_rsvp_click`, and `newsletter_submit` into `window.dataLayer`; a Plausible or PostHog snippet picks them up automatically.

## Content notes

- Workshops are at SF Commons, San Francisco: 540 Laguna St (540 Cafe) for most, 550 Laguna St (North Studio / Full Studio) for the Friday founder group and the Oct 13 session of When the Work Changes. Some run on Zoom.
- Testimonials on the Founders page are real quotes; add more only with permission.
- Confirm event photos are approved for public use before adding them.

# InsightsOut operations map

What lives where, who changes it, and how it stays in sync. Canonical copy of this map is this file; the Drive doc of the same name is a mirror for reading on a phone.

## The one source of truth
`data/site.json` in this repo. Names, headlines, booking links, cohort facts, workshop series, retired names, and the IDs of every external artifact below. Change it first; `scripts/check_site.py` then lists every file still carrying the old value.

## Systems and what each one holds

| System | Holds | Changed by | Checked by |
|---|---|---|---|
| Repo `imanima/Insightsout-work`, branch `main` | The site. Vercel deploys main within a minute. | Either session, after `git fetch`. | `scripts/check_site.py` on every push and every Monday (GitHub Action). |
| `data/site.json` | Canonical names, links, cohorts, series, retired names, external IDs. | Whoever renames anything, first. | The checker reads it. |
| Luma calendar `luma.com/NimaImani` | Every event and its dates. The site reads it live through `/api/events`. | Nima, on Luma. | Live dates on Home, Workshops, each workshop page. Static fallbacks are checked for past dates. |
| Tally form `WOGzMe` | Applications for The InsightsOut Cohort. Asks which situation is closest (team, career, building on the side) and the one goal. Email notification to Nima is on. | Claude via Tally tools, then publish. | Intro text must match the cohort facts in `data/site.json`. |
| Gmail draft `r595996861093608350` | The post-event follow-up template (long version). | Claude via Gmail tools; Nima sends. | Cohort names and dates by hand after a rename. |
| `scripts/followup_email.py` | Generates the short Luma blast, the Gmail version, and the weekly letter with live dates. Reads `data/site.json`. | Run it; never edit the output by hand. | Checker confirms cohort names. |
| Claude business plan doc | Strategy, numbers, 90-day plan. | Claude via docs tools. | By hand after a rename. |
| Drive: LinkedIn company page doc, Contacts playbook, Newsletter System, Substack seed posts, Substack starter kit | Paste-ready copy and playbooks. | Claude creates new versions (the connector cannot edit in place); Nima trashes old ones. | IDs in `data/site.json`; the current version carries "(current)" in its title. |
| Drive index `00 Drive Index` | Where everything in Drive lives. | Nima's browser session only. | Rows owed are listed below. |
| Reviews and introductions (native forms, `js/forms.js` + `api/inbox.js`) | Quotes with permission level; referrals with permission to name the referrer. | The site forms post to `/api/inbox`, which files one issue per submission in the private repo `imanima/insightsout-inbox` (GitHub emails Nima). Until `INBOX_GITHUB_TOKEN` is set in Vercel, the form offers the Tally link instead (forms OQDlWM, QoKeLg). Approved quotes go into `data/reviews.json`, then `python3 scripts/build_reviews.py` renders reviews.html, cohorts.html and coaching.html. | Ids in `data/site.json`. The checker fails if the pages are out of sync with the data file. Quote only with the permission the person chose. |
| LinkedIn company page | Logo, cover, tagline, About, fields, events, posts. | Nima pastes from the current Drive doc (v5). Images live in `assets/linkedin/`. | None automatic. |
| Substack | Not created yet. When it exists, set `NEWSLETTER_URL` in `js/config.js`. | Nima. | |
| `slides/keep-going.*` | End-of-workshop slide with QR codes (Luma calendar, cohorts page, free call). | Regenerate if a link changes. | |

## Routines
- **After every event (same day):** `python3 scripts/followup_email.py --event "<name>" --date YYYY-MM-DD --note "<one sentence>"`, paste the short version into the Luma blast, send. Voice debrief into the CRM.
- **Tuesday:** `python3 scripts/followup_email.py --weekly --note "<your paragraph>"`, paste into the newsletter.
- **Monday (automatic):** the GitHub check runs. A red email from GitHub means a stale date or a broken link; fix it the same day.
- **When Luma dates change:** nothing on the site needs editing. If a static fallback date has passed, the checker says so; update the row.
- **When a name changes:** follow the rename steps in `CLAUDE.md`.

## Open items that need Nima's browser
- Switch the inbox on: create the private repo `insightsout-inbox`, a fine-grained token with Issues read and write on it, and the Vercel env var `INBOX_GITHUB_TOKEN`; redeploy; send a test review. Steps in the Reviews doc, section 11.
- Drive index rows for: LinkedIn company page v5, Contacts playbook v3, Newsletter System, Substack seed posts, Post-event follow-up template, InsightsOut operations map.
- Trash the superseded docs: Review ask v1 and Reviews and introductions v2 and v3 (replaced by v4), LinkedIn company page v2, v3 and v4, Contacts playbook v1 and v2, the Oct 13 follow-up template doc.
- Scan the three QR codes on `slides/keep-going.png` once with a phone.
- Create the Substack and send the URL back so the site's subscribe forms go live.

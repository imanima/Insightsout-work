# Research publishing — operator guide

The site's research layer is a ledger of findings plus papers that read from it. Full design: *InsightsOut Publishing Pipeline* (Data Scientist & Analyst project). Two-minute version:

## The rule
No published number lives in HTML. Numbers live in `data/findings.json` (one record per finding: claim, stat, n, waves, external anchor, status). Pages reference them with `data-finding="ID"`; `js/findings.js` fills them at load.

## After each event wave (patch release, ~1 hour)
1. Ingest, dedup, code, append master dataset (Research OS §5).
2. Recompute the ledger stats touched by the new wave → edit `data/findings.json` (also bump `dataset.version`, `waves`, `registrations`, `unique_people`, `date_range`).
3. Add one changelog line + bump `version` (1.0 → 1.1) in `research-src/papers/<paper>.md`.
4. `python3 scripts/build_research.py` (add `--pdf` if Chrome is installed).
5. Open `research/<paper>.html` over `python3 -m http.server`, read once, commit.

## Each quarter (minor edition, ~half a day)
Re-read the paper end to end, refresh anchors from the last ~13 weekly briefs, write the edition note, bump 1.x → 1.(x+1), rebuild with `--pdf`, publish a research brief on the strongest hypothesis, mirror to LinkedIn + newsletter.

## New paper
Copy `research-src/papers/working-through-ai-change.md`, change front-matter (`slug`, `title`, `type`, `version: 1.0`, `status: draft` until approved), write, build. `status: draft` keeps it out of the public list and sitemap while the page still renders for review.

## Placeholders
`{{finding:ID}}` stat · `{{finding:ID|stat.detail}}` any field · `{{card:ID}}` full card · `{{dataset:field}}` · `{{meta:field}}`.
`python3 scripts/build_research.py --check` validates IDs without writing.

## Surfacing on the Research hub
Add to `insights.html` under the hand-written cards:
```html
<div class="article-list" data-research-list data-types="white-paper,brief"></div>
<script src="js/findings.js?v=1" defer></script>
```

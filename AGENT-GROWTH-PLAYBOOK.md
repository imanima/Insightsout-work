# InsightsOut — Growth Playbook for the Site Agent
Subscriptions (Luma) · Newsletters · LLM / AI-search visibility
Owner: Nima Imani · Written 2026-08-18 · Any agent (Claude Code, Cowork, a human) editing this repo follows this file.

---

## Part 1 — Subscriptions and newsletters

### System of record (now): Luma calendar `InsightsOut` (luma.com/NimaImani), Luma Plus
- Every subscriber = a person in Luma → People. Sources: event registrations (automatic), calendar followers, website forms (via `/api/subscribe`), CSV imports.
- Website forms: `form.js-subscribe` on `index.html` (#subscribe, tag `home`), `events.html` (#community-updates, tag `community`), `coaching.html` (#subscribe, tag `coaching`), `insights.html` (#subscribe, tag `research`). Handler: `js/main.js` → POST JSON `{email, source, consent}` to `IO_CONFIG.NEWSLETTER_ENDPOINT` = `/api/subscribe`.
- `api/subscribe.js` (Vercel Node function): validates, honeypot, calls `POST https://public-api.luma.com/v1/calendar/import-people` with header `x-luma-api-key: $LUMA_API_KEY`, body `{infos:[{email,name?}], tag_names:[source]}`. Tags must already exist in Luma; on a 4xx it retries untagged. Never put the key in client JS or commit it.
- One-time setup (Nima): Vercel → Settings → Environment Variables → `LUMA_API_KEY` (Production + Preview) → redeploy. Luma → People → Tags: create `home`, `community`, `coaching`, `research`, `website`, `legacy-list`. Import the 6.4k CSV with tag `legacy-list` (Luma dedupes on email; unsubscribed people are never re-added).
- Newsletters: Luma → People → Newsletter. Cap 5,000 sends/week on Plus (invites + newsletters; messages to registered guests of an event are unlimited). For a full-list send either tag-split across two Mondays or add the 10k/week pack. Track opens/clicks/unsubs per send in Luma; log the headline number in the Coaching CRM sheet.
- Cadence: one note every two weeks. Shape: 1 field note from the Friday founder room or a research finding (3–5 short paragraphs, Nima's voice — see `nima-voice` skill), next 1–2 events with Luma links, one line on coaching with the free-call link. Never more than one CTA block.
- Welcome: Luma has no automation. Until Phase 2, the on-page success message is the welcome; the next scheduled newsletter is the first touch. Optional manual: weekly, filter People by "added this week" + tag `home/coaching/...` and send a short "glad you're here" blast to that tag.

### Phase 2 (when a welcome sequence, segmentation beyond tags, or >1 send/2 weeks is wanted): Kit (fallback MailerLite)
1. Export Luma People CSV → import to Kit; keep tags. 2. Set `NEWSLETTER_ENDPOINT` to the Kit form endpoint (the form already sends `email`; Kit expects `email_address` — map it in `main.js` or via Kit's JSON endpoint). 3. Turn on the Kit ↔ Luma app so registrants keep flowing with `luma_<event>` tags. 4. Newsletters move to Kit; Luma keeps event invites/reminders only. Never send the same issue from both.

---

## Part 2 — LLM / AI-search visibility (GEO)

Goal: when someone asks ChatGPT, Claude, Perplexity, Gemini or Google AI Overviews questions like the ones below, InsightsOut / Nima Imani is named, described accurately, and linked.

### Target questions (keep this list current; add real questions from prospects)
Founders: "co-founder conflict coach San Francisco" · "coach for founder decision overwhelm" · "co-founder alignment coaching" · "how do co-founders write a working agreement" · "founder group coaching San Francisco free" · "Nima Imani coach".
Organizations: "AI change management for leadership teams" · "human side of AI adoption workshop" · "manager workshop AI role change" · "AI enablement lab for one team" · "what should stay human AI leadership" · "leadership alignment on AI San Francisco".
Research: "research on AI overwhelm at work" · "how people feel about role change from AI" · "founder overwhelm research".

### How LLMs pick sources (design rules)
1. They quote pages that answer a question directly in the first 1–3 sentences, in plain prose, with the entity named ("InsightsOut is…", "Nima Imani is…"). Write the answer first, the story after.
2. They trust entities that are consistent everywhere: same name, same one-line description, same location, same offers, same prices, across the site, LinkedIn, Luma, Maven, MentorCruise, Google Business Profile, ICF directory. Drift = doubt.
3. They favor pages other sites cite. Off-site mentions (event listings, guest posts, podcast notes, community answers, directories) matter as much as on-site copy.
4. They read structured data (JSON-LD) and machine summaries (`llms.txt`) and reward fresh `dateModified`.
5. Static, fast, crawlable HTML with clear headings and no login walls — this site already qualifies. Keep it that way: no client-side-only content for anything important.

### On-site — done 2026-08-18 (maintain)
- `llms.txt` at root — the canonical summary. Update whenever offers, prices, events, or research change. Keep under ~1,200 words.
- `robots.txt` — explicit allows for GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-User, Claude-SearchBot, PerplexityBot, Perplexity-User, Google-Extended, Applebot-Extended, DuckAssistBot, meta-externalagent, CCBot. `/api/` disallowed. Do not add blanket AI-bot blocks; if Vercel's firewall has an "AI bots" toggle, keep it OFF for this project.
- JSON-LD `@graph` on every indexed page: Organization+ProfessionalService (`#organization`), Person Nima Imani (`about.html#nima`), WebSite, WebPage/AboutPage/CollectionPage, Service ×4 (organizations), Service ×2 + Event ×2 + FAQPage (coaching), EventSeries (events), Article/ScholarlyArticle with author/publisher/dates (+ PDF `encoding`) on every article and research paper. Rules: only mark up what is visible on the page; keep `@id`s stable; bump `dateModified` on real content edits; validate at validator.schema.org before commit.
- FAQ blocks with visible Q&A + FAQPage schema: coaching (exists), organizations (added). Add one to `about.html` ("Who is Nima Imani?", "What is InsightsOut?", "Where are you based?") and to each research paper ("What is this paper based on?", "How often is it updated?").
- `sitemap.xml` with `lastmod`; `vercel.json` redirects `/coaching` → `/coaching.html`.

### On-site — content program (do in this order; one item per week is enough)
1. **Answer pages** (`/answers/<slug>.html`, 500–900 words each, Article schema, one H1 phrased as the question, first paragraph is the answer, then evidence, then "how we work on this", then CTA). Start with: "How do co-founders write a working agreement?" · "What causes founder decision overwhelm and what helps?" · "Why AI rollouts stall on people, not tools" · "How to run a leadership alignment session on AI" · "What should stay human when a team adopts AI?" Link each from the relevant hub page and from `llms.txt`.
2. **Definitional paragraph on Home** (visible, near the top): "InsightsOut is a San Francisco practice, founded by Nima Imani, that works on the human side of AI change with leadership teams, managers, and founders." One sentence, entity-first.
3. **Research pages**: add "Key findings" as 3–5 one-sentence bullets at the top with numbers (n, %, wave), a "How to cite" line (Author, year, title, URL, version), and a `dateModified` bump every wave. LLMs love citable, versioned, numbered findings.
4. **Testimonials with names + roles** (already two on coaching). Add one org quote when available. Real and permissioned only.
5. **Internal linking**: every page links to Coaching, Organizations, and the two most relevant research papers in body text (not just nav).
6. **Author box** on every article/research page: photo, "Nima Imani — ICF-certified coach, founder of InsightsOut", LinkedIn link, `Person` `@id`.
7. **Freshness**: monthly, touch one research page (new wave or a paragraph) and one answer page. Update `dateModified` honestly.

### Off-site — entity consistency and citations (highest leverage after answer pages)
- One canonical description everywhere (copy from `llms.txt` header). Update: LinkedIn (headline, About, Services page), Luma calendar bio, Maven instructor bio, MentorCruise profile, Google Business Profile ("Business or professional coach", SF, link to /coaching.html), ICF Credentialed Coach Finder, Crunchbase person/org, Frontier Tower community page if it lists hosts.
- Every Luma event description: first line names InsightsOut + Nima Imani + the theme + a link to the relevant answer/research page. Luma pages are crawled and cited often.
- Publish each research paper's key findings as a LinkedIn article and a short post; link back to the canonical URL. Ask 2–3 collaborators/venues (Frontier Tower, co-hosts, guests) to link to the paper.
- Answer questions where LLMs source from: Reddit (r/startups, r/cofounder, r/Entrepreneur), Indie Hackers, Hacker News "Ask HN", Quora — 3–5 sentence real answers, link only when it helps. Two per week.
- Podcasts / guest posts on co-founder conflict and AI role change: pitch with the research numbers. Show notes create the citations LLMs surface.
- Wikipedia/Wikidata: do NOT create self-promotional entries. If a third party writes about the research, a Wikidata item for the paper is fine.

### Measurement — monthly LLM visibility test (first Monday; log to sheet "LLM Visibility Log")
For each target question, ask ChatGPT (with search), Claude, Perplexity, Gemini, and Google (AI Overview). Record: mentioned? (y/n) · position (1st/2nd/…) · description accurate? · URL cited · competitor names shown. Also record Google Search Console impressions/clicks for the same queries. Trend over 3 months; double down on the pages that get cited; rewrite the ones that don't (usually: answer not in first paragraph, or no off-site citation).

### Guardrails
- Voice stays Nima's (plain, beside the reader, no guru). No keyword stuffing, no fake FAQs, no invented testimonials or numbers, no hidden text, no schema for content that isn't on the page.
- Prices/offers change → update in this order: `coaching.html` copy → its JSON-LD → `llms.txt` → LinkedIn/Maven/MentorCruise/Luma. Same day.
- Never add AI-bot blocks, noindex, or JS-only rendering to indexed pages.

### Per-commit checklist (agent)
[ ] Visible answer-first paragraph on any new page  [ ] JSON-LD valid, `dateModified` right  [ ] Added to `sitemap.xml` + `llms.txt` if new  [ ] Internal links in body  [ ] Meta title/description ≤ 60/155 chars, entity named  [ ] Subscribe form present on hub pages  [ ] `robots.txt` untouched  [ ] Cache-bust `css/js` version if edited.

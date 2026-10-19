#!/usr/bin/env python3
"""Drift check for insightsout.work. Run before every push; CI runs it on every push and every Monday.

  python3 scripts/check_site.py          # exit 1 on any problem
  python3 scripts/check_site.py --warn   # report only

Checks, against data/site.json and today's date:
  - every internal link, anchor, image and asset resolves
  - every JSON-LD block parses; no nested <a>
  - every page: current nav (Organizations · 1:1 Coaching · Cohorts · Workshops · About), current footer line,
    one stylesheet version, a skip link, a nav button that is one of the two calendars
  - no retired name or retired link anywhere (data/site.json "retired_names")
  - cohort names on the site match data/site.json, and the Tally cohort= keys match
  - no static fallback date in the past (<time datetime>, data-event-date, and the dated text inside
    data-luma-next / data-luma-when spans), so a page never advertises a past date even if Luma is down
  - sitemap lists every page and nothing else; llms files only link to pages that exist
"""
import datetime as dt, glob, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
SITE = json.load(open("data/site.json"))
TODAY = dt.date.today()
WARN = "--warn" in sys.argv
problems = []
def bad(kind, where, what=""): problems.append((kind, where, what))

pages = sorted(p for p in glob.glob("**/*.html", recursive=True) if not p.startswith(("out/", "slides/", "node_modules/")))
NAV = ("Organizations", "1:1 Coaching", "Cohorts", "Workshops", "About")
CALS = {SITE["booking"]["coaching"], SITE["booking"]["org"]}
MONTHS = "January|February|March|April|May|June|July|August|September|October|November|December"
css_versions = set()

for p in pages:
    s = open(p).read(); d = os.path.dirname(p); ids = set(re.findall(r'id="([^"]+)"', s))
    # links
    for h in re.findall(r'href="([^"]+)"', s):
        if h.startswith(("http", "mailto:")): continue
        if h.startswith("#"):
            if h[1:] not in ids: bad("anchor", p, h)
            continue
        path, _, frag = h.partition("#")
        path = path.split("?")[0]
        t = path.lstrip("/") if path.startswith("/") else os.path.normpath(os.path.join(d, path))
        if path.startswith("/") and not t: t = "index.html"
        if path.startswith("/") and not os.path.exists(t) and os.path.exists(t + ".html"): t += ".html"
        if not os.path.exists(t): bad("missing link", p, h); continue
        if frag and t.endswith(".html") and 'id="%s"' % frag not in open(t).read(): bad("bad fragment", p, h)
    for src in re.findall(r'src="([^"]+)"', s):
        if src.startswith("http"): continue
        t = src.lstrip("/") if src.startswith("/") else os.path.normpath(os.path.join(d, src.split("?")[0]))
        if not os.path.exists(t.split("?")[0]): bad("missing src", p, src)
    for b in re.findall(r'<script type="application/ld\+json">(.*?)</script>', s, re.S):
        try: json.loads(b)
        except Exception as e: bad("json-ld", p, str(e)[:60])
    if re.search(r"<a [^>]*>(?:(?!</a>).)*<a ", s, re.S): bad("nested anchor", p)
    # chrome
    if p != "404.html":
        navitems = re.findall(r'<div class="nav-links">(.*?)</div>', s, re.S)
        navset = tuple(re.findall(r">([^<]+)</a>", navitems[0])) if navitems else ()
        if navset != NAV: bad("nav items", p, str(navset))
        btn = re.search(r'<nav class="site">.*?<a class="btn btn-primary btn-sm" href="([^"]+)"', s, re.S)
        ok = btn and (btn.group(1) in CALS or "tally.so" in btn.group(1) or btn.group(1) == SITE["luma_calendar"]
                      or (btn.group(1).startswith("#") and btn.group(1)[1:] in ids))
        if not ok: bad("nav button", p, btn.group(1) if btn else "none")
        if "Human leadership for work in motion" not in s: bad("footer", p)
        if 'class="skip-link"' not in s or 'id="main"' not in s: bad("skip link", p)
    css_versions.update(re.findall(r"style\.css\?v=(\d+)", s))
    # retired names
    body = re.sub(r"<script.*?</script>", "", s, flags=re.S)
    for name in SITE["retired_names"]:
        if name in body: bad("retired name", p, name)
    # past dates in static fallbacks
    for iso in re.findall(r'(?:datetime|data-event-date)="(\d{4}-\d{2}-\d{2})"', s):
        if dt.date.fromisoformat(iso) < TODAY: bad("past date", p, iso)
    for span in re.findall(r'data-luma-(?:next|when)[^>]*>(.*?)</(?:span|p)>', s, re.S):
        for mon, day in re.findall(r"(%s) (\d{1,2})" % MONTHS, span):
            m = dt.datetime.strptime(mon, "%B").month
            y = TODAY.year if m >= TODAY.month - 1 else TODAY.year + 1
            if dt.date(y, m, int(day)) < TODAY and "Every" not in span: bad("past date in text", p, "%s %s" % (mon, day))

if len(css_versions) > 1: bad("css versions differ", "site", str(sorted(css_versions)))

# cohort names and keys
coh = open("cohorts.html").read()
for c in SITE["cohorts"]:
    if "<h3>%s</h3>" % c["name"] not in coh: bad("cohort name missing on cohorts page", "cohorts.html", c["name"])
    if "cohort=%s&" % c["key"] not in coh: bad("cohort apply key missing", "cohorts.html", c["key"])
    if c["name"] not in open("index.html").read(): bad("cohort name missing on home", "index.html", c["name"])
    for f in ("llms.txt", "llms-full.txt", "scripts/followup_email.py"):
        if c["name"] not in open(f).read(): bad("cohort name missing", f, c["name"])
for f in ("llms.txt", "llms-full.txt", "README.md", "scripts/followup_email.py"):
    t = open(f).read()
    for name in SITE["retired_names"]:
        if name in t: bad("retired name", f, name)

# sitemap and llms
site_urls = set(re.findall(r"<loc>https://insightsout.work/?([^<]*)</loc>", open("sitemap.xml").read()))
page_urls = {p[:-5] if p != "index.html" else "" for p in pages if p != "404.html"}
for u in sorted(site_urls - page_urls - {"llms.txt"}): bad("sitemap lists missing page", "sitemap.xml", u)
for u in sorted(page_urls - site_urls): bad("page missing from sitemap", "sitemap.xml", u)
for f in ("llms.txt", "llms-full.txt"):
    for u in set(re.findall(r"https://insightsout\.work/([a-z0-9/\-]+)", open(f).read())):
        if u.rstrip("/") not in page_urls and u not in ("llms-full", "llms", "sitemap"): bad("dead link", f, u)

if problems:
    print("check_site: %d problem(s)" % len(problems))
    for k, w, x in problems: print("  [%s] %s %s" % (k, w, x))
    sys.exit(0 if WARN else 1)
print("check_site: ok (%d pages, %s)" % (len(pages), TODAY))

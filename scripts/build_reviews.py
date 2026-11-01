#!/usr/bin/env python3
"""Render data/reviews.json into the pages that show quotes.

Each target page carries a pair of markers:
    <!-- reviews:start key -->  ...  <!-- reviews:end -->
where key is one of: cohorts, coaching, home, all (reviews.html).
Run:  python3 scripts/build_reviews.py          (writes the pages)
      python3 scripts/build_reviews.py --check  (exit 1 if any page is stale)
"""
import json, re, sys, html
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = json.loads((ROOT / "data/reviews.json").read_text(encoding="utf-8"))["reviews"]
PROGRAM = {"group": "Group coaching", "coaching": "1:1 coaching", "workshop": "Workshop", "organization": "Organization"}
LIMIT = {"cohorts": 3, "coaching": 4}
TARGETS = {"cohorts": ROOT / "cohorts.html", "coaching": ROOT / "coaching.html", "all": ROOT / "reviews.html"}

def esc(s): return html.escape(s, quote=True)

def display_name(r):
    if r["permission"] == "anon": return ""
    if r["permission"] == "first": return r["name"].split()[0]
    return r["name"]

def initials(r):
    n = display_name(r) or "A"
    parts = [p for p in re.split(r"[\s,]+", n) if p and p[0].isalpha()]
    return "".join(p[0] for p in parts[:2]).upper() or "A"

def card(r, long=False):
    name = display_name(r)
    who = esc(name) if name else "Anonymous"
    if name and r.get("linkedin") and r["permission"] == "name":
        who = f'<a href="{esc(r["linkedin"])}" target="_blank" rel="noopener">{esc(name)}</a>'
    photo = (f'<img class="review-photo" src="{esc(r["photo"])}" alt="" width="44" height="44" loading="lazy">'
             if r.get("photo") and name else f'<span class="review-photo review-initials" aria-hidden="true">{esc(initials(r))}</span>')
    tag = PROGRAM.get(r["program"], r["program"])
    head = f'<p class="review-headline">{esc(r["headline"])}</p>' if r.get("headline") else ""
    return (f'<figure class="review-card" data-program="{esc(r["program"])}">\n'
            f'  {head}\n'
            f'  <blockquote>&ldquo;{esc(r["quote"])}&rdquo;</blockquote>\n'
            f'  <figcaption>{photo}<span class="review-who"><strong>{who}</strong><span>{esc(r["role"])} &middot; {esc(tag)}</span></span></figcaption>\n'
            f'</figure>')

def render(key):
    if key == "all":
        return "\n".join(card(r, True) for r in DATA)
    picks = [r for r in DATA if key in r.get("featured", [])][:LIMIT.get(key, 3)]
    return "\n".join(card(r) for r in picks)

def apply(check=False):
    stale = []
    for key, path in TARGETS.items():
        if not path.exists(): continue
        s = path.read_text(encoding="utf-8")
        pat = re.compile(rf"(<!-- reviews:start {key} -->)(.*?)(<!-- reviews:end -->)", re.S)
        m = pat.search(s)
        if not m:
            print(f"build_reviews: {path.name} has no reviews:start {key} marker"); sys.exit(1)
        new = "\n" + render(key) + "\n"
        if m.group(2) != new:
            stale.append(path.name)
            if not check:
                path.write_text(s[:m.start(2)] + new + s[m.end(2):], encoding="utf-8")
    counts = {p: sum(1 for r in DATA if r["program"] == p) for p in PROGRAM}
    if check:
        if stale:
            print("build_reviews: stale pages, run scripts/build_reviews.py:", ", ".join(stale)); sys.exit(1)
        print("build_reviews: pages in sync", counts)
    else:
        print("build_reviews: wrote", ", ".join(stale) if stale else "nothing (already in sync)", counts)

if __name__ == "__main__":
    apply(check="--check" in sys.argv)

#!/usr/bin/env python3
"""
Build InsightsOut research publications.

  research-src/papers/*.md  →  research/<slug>.html   (site chrome, live numbers from data/findings.json)
                             →  data/research.json    (publications manifest, read by js/findings.js)
                             →  sitemap.xml           (adds missing research URLs)
  --pdf                      →  research/pdf/<slug>-v<version>.pdf  (headless Chrome, optional)

Usage (from the repo root):
  python3 scripts/build_research.py
  python3 scripts/build_research.py --pdf
  python3 scripts/build_research.py --check     # validate placeholders against the ledger, no writes

Placeholders inside the markdown:
  {{finding:ID}}            → headline stat (filled at page load from data/findings.json)
  {{finding:ID|stat.detail}}→ any field of the finding
  {{card:ID}}               → full finding card (stat + claim + anchor)
  {{dataset:field}}         → dataset-level field (unique_people, waves, date_range …)
  {{meta:field}}            → front-matter field of this paper (version, date …)

Front-matter is a small YAML subset: key: value, quoted strings, and a "changelog:" list of "- item" lines.
No third-party dependencies. If the `markdown` package is installed it is used; otherwise a minimal converter runs.
"""
import json, os, re, sys, html, subprocess, shutil, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "research-src", "papers")
OUT = os.path.join(ROOT, "research")
PDF_DIR = os.path.join(OUT, "pdf")
LEDGER = os.path.join(ROOT, "data", "findings.json")
MANIFEST = os.path.join(ROOT, "data", "research.json")
SITEMAP = os.path.join(ROOT, "sitemap.xml")
SITE = "https://insightsout.work"

# ---------- front-matter ----------
def parse_front_matter(text):
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", text, re.S)
    if not m:
        raise SystemExit("missing front-matter")
    meta, body = {}, m.group(2)
    current_list = None
    for line in m.group(1).splitlines():
        if not line.strip():
            continue
        if line.startswith("  - ") and current_list is not None:
            meta[current_list].append(_unquote(line[4:]))
            continue
        k, _, v = line.partition(":")
        k, v = k.strip(), v.strip()
        if v == "":
            meta[k] = []
            current_list = k
        else:
            meta[k] = _unquote(v)
            current_list = None
    return meta, body

def _unquote(v):
    v = v.strip()
    if len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'":
        return v[1:-1]
    return v

# ---------- markdown ----------
def md_to_html(body):
    body = re.sub(r"<!--.*?-->", "", body, flags=re.S)
    try:
        import markdown  # type: ignore
        return markdown.markdown(body, extensions=["extra"])
    except ImportError:
        return _mini_md(body)

def _inline(s):
    s = html.escape(s, quote=False)
    s = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', s)
    s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"(?<!\*)\*(?!\s)(.+?)(?<!\s)\*(?!\*)", r"<em>\1</em>", s)
    s = re.sub(r"`(.+?)`", r"<code>\1</code>", s)
    return s

def _mini_md(body):
    out, para, in_list = [], [], None
    def flush_para():
        if para:
            out.append("<p>" + _inline(" ".join(para)) + "</p>")
            para.clear()
    def close_list():
        nonlocal in_list
        if in_list:
            out.append("</%s>" % in_list); in_list = None
    for raw in body.splitlines():
        line = raw.rstrip()
        if not line.strip():
            flush_para(); close_list(); continue
        if (line.lstrip().startswith("<") and not line.lstrip().startswith("<a ")) or re.match(r"^\s*\{\{card:[^}]+\}\}\s*$", line):
            flush_para(); close_list(); out.append(line.strip()); continue
        m = re.match(r"^(#{1,6})\s+(.*)$", line)
        if m:
            flush_para(); close_list()
            lvl = len(m.group(1)); out.append("<h%d>%s</h%d>" % (lvl, _inline(m.group(2)), lvl)); continue
        m = re.match(r"^\s*[-*]\s+(.*)$", line)
        if m:
            flush_para()
            if in_list != "ul": close_list(); out.append("<ul>"); in_list = "ul"
            out.append("<li>" + _inline(m.group(1)) + "</li>"); continue
        m = re.match(r"^\s*\d+[.)]\s+(.*)$", line)
        if m:
            flush_para()
            if in_list != "ol": close_list(); out.append("<ol>"); in_list = "ol"
            out.append("<li>" + _inline(m.group(1)) + "</li>"); continue
        if line.startswith(">"):
            flush_para(); close_list(); out.append("<blockquote><p>" + _inline(line[1:].strip()) + "</p></blockquote>"); continue
        close_list(); para.append(line.strip())
    flush_para(); close_list()
    return "\n".join(out)

# ---------- placeholders ----------
def resolve_cards(text, ledger, problems):
    """Block-level cards are resolved BEFORE markdown so they are not wrapped in <p>."""
    ids = {f["id"] for f in ledger.get("findings", [])}
    def card(m):
        fid = m.group(1).strip()
        if fid not in ids: problems.append("unknown finding id: " + fid)
        return '\n<div class="article-callout finding-card" data-finding-card="%s"><p class="method-note">Loading finding %s…</p></div>\n' % (fid, fid)
    return re.sub(r"^\s*\{\{card:([^}]+)\}\}\s*$", card, text, flags=re.M)

def resolve_placeholders(text, meta, ledger, problems):
    ids = {f["id"] for f in ledger.get("findings", [])}
    def finding(m):
        fid, _, field = m.group(1).partition("|")
        if fid not in ids: problems.append("unknown finding id: " + fid)
        field = field or "stat.value"
        return '<span class="finding" data-finding="%s" data-field="%s">…</span>' % (fid, field)
    def card(m):
        fid = m.group(1)
        if fid not in ids: problems.append("unknown finding id: " + fid)
        return '<div class="article-callout finding-card" data-finding-card="%s"><p class="method-note">Loading finding %s…</p></div>' % (fid, fid)
    def dataset(m):
        return '<span data-dataset="%s">…</span>' % m.group(1)
    def metaf(m):
        return html.escape(str(meta.get(m.group(1), "")))
    text = re.sub(r"\{\{finding:([^}]+)\}\}", finding, text)
    text = re.sub(r"\{\{card:([^}]+)\}\}", card, text)
    text = re.sub(r"\{\{dataset:([^}]+)\}\}", dataset, text)
    text = re.sub(r"\{\{meta:([^}]+)\}\}", metaf, text)
    return text

# ---------- page ----------
TEMPLATE = """<!DOCTYPE html>
<html lang="en" data-research-root="../">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title} | InsightsOut Research</title>
  <meta name="description" content="{summary_attr}">
  <link rel="canonical" href="{site}/research/{slug}.html">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{summary_attr}">
  <meta property="og:image" content="{site}/{og_image}">
  <link rel="icon" type="image/svg+xml" href="../assets/logo.svg">
  <link rel="stylesheet" href="../css/style.css?v=39">
  <style>
    .paper-meta{{display:flex;flex-wrap:wrap;gap:.6rem 1.4rem;font-size:.9rem;opacity:.8;margin:.6rem 0 0}}
    .paper-meta span{{white-space:nowrap}}
    .finding-card{{margin-top:28px;padding:26px 30px}}
    .finding-card .research-stat{{margin-bottom:.6rem}}
    .finding-card p{{color:var(--ink,#1a1a1a)}}
    .finding-card .method-note{{margin-top:.6rem}}
    .article-body blockquote{{margin:1.4rem 0;padding:.2rem 0 .2rem 1.2rem;border-left:3px solid var(--line,#ddd);font-style:italic}}
    .article-body blockquote p{{margin:.4rem 0}}
    .article-body h2{{margin-top:2.6rem}}
    .finding-candidate{{border-bottom:1px dotted currentColor}}
    .finding-missing::after{{content:" [n/a]";opacity:.6}}
    .changelog li{{margin:.25rem 0}}
    .paper-actions{{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1rem}}
    @media print{{nav.site,.msticky,footer.site,.article-footer-cta,.paper-actions{{display:none!important}}}}
  </style>
  <script src="../js/config.js?v=6" defer></script>
  <script src="../js/main.js?v=8" defer></script>
  <script src="../js/findings.js?v=1" defer></script>
</head>
<body>

<nav class="site">
  <div class="nav-inner">
    <a class="wordmark" href="../index.html"><img src="../assets/logo.svg" alt="" aria-hidden="true">Insights<em>Out</em></a>
    <div class="nav-links">
      <a href="../events.html">Community</a>
      <a href="../coaching.html">Coaching</a>
      <a href="../organizations.html">Organizations</a>
      <a href="../insights.html" class="active">Research</a>
      <a href="../about.html">About</a>
    </div>
    <a class="btn btn-primary btn-sm" href="../insights.html#subscribe">Get Updates</a>
  </div>
</nav>

<main>
  <article>
    <header class="article-hero">
      <div class="article-wrap">
        <p class="eyebrow">{type_label} · InsightsOut research</p>
        <h1>{title}</h1>
        {subtitle_html}
        <p class="article-byline">By {author} · {date_human} · {read_time}</p>
        <p class="paper-meta">
          <span>Version {version}</span>
          <span>n = <span data-dataset="unique_people">{n}</span> people</span>
          <span><span data-dataset="waves">{waves}</span> workshop waves</span>
          <span><span data-dataset="date_range">{date_range}</span></span>
        </p>
        <div class="paper-actions">
          {pdf_link}
          <a class="btn btn-ghost btn-sm" href="methodology.html">Method &amp; limits</a>
          <a class="btn btn-ghost btn-sm" href="#changelog">What changed</a>
        </div>
      </div>
    </header>

    <div class="article-wrap article-body">
{body}

      <div class="article-callout" id="changelog">
        <h2>What changed</h2>
        <ul class="changelog">
{changelog_html}
        </ul>
        <p class="method-note">This is a living paper. Numbers on this page are read from the InsightsOut findings ledger and reflect the dataset version shown above. Older PDF editions remain available.</p>
      </div>

      <div class="article-callout">
        <h2>Limits</h2>
        <p data-dataset="limits">{limits}</p>
      </div>

      <div class="article-footer-cta">
        <h2>Bring this into your organization.</h2>
        <p>We run this work with leadership teams and managers navigating AI-driven change.</p>
        <div class="cta-row">
          <a class="btn btn-primary" href="../organizations.html">For Organizations</a>
          <a class="btn btn-ghost" href="../insights.html">All Research</a>
        </div>
      </div>
    </div>
  </article>
</main>

<footer class="site">
  <div class="wrap">
    <div class="footer-bottom">
      <span class="footer-brand">InsightsOut · Human leadership for the age of AI</span>
      <span class="footer-links"><a href="../events.html">Community</a> · <a href="../coaching.html">Coaching</a> · <a href="../organizations.html">Organizations</a> · <a href="../insights.html">Research</a> · <a href="../about.html">About</a></span>
      <span class="footer-meta">San Francisco · <a href="https://www.linkedin.com/in/imaninima/" target="_blank" rel="noopener">LinkedIn</a></span>
    </div>
  </div>
</footer>

<div class="msticky">
  <a class="btn btn-primary btn-sm" href="../insights.html#subscribe">Get Updates</a>
</div>

</body>
</html>
"""

def human_date(iso):
    try:
        return datetime.date.fromisoformat(iso).strftime("%B %-d, %Y")
    except Exception:
        return iso

def build_pdf(slug, version):
    chrome = os.environ.get("CHROME_BIN")
    for c in ([] if chrome else ["google-chrome", "chromium", "chromium-browser",
              "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"]):
        if shutil.which(c) or os.path.exists(c):
            chrome = c; break
    if not chrome:
        print("  ! Chrome not found; skipping PDF"); return None
    os.makedirs(PDF_DIR, exist_ok=True)
    # Serve over http so fetch() for the ledger works inside the PDF render.
    import http.server, socketserver, threading
    handler = lambda *a, **k: http.server.SimpleHTTPRequestHandler(*a, directory=ROOT, **k)
    httpd = socketserver.TCPServer(("127.0.0.1", 0), handler)
    port = httpd.server_address[1]
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    out = os.path.join(PDF_DIR, "%s-v%s.pdf" % (slug, version))
    subprocess.run([chrome, "--headless=new", "--no-sandbox", "--disable-gpu", "--no-pdf-header-footer",
                    "--virtual-time-budget=4000", "--print-to-pdf=" + out,
                    "http://127.0.0.1:%d/research/%s.html" % (port, slug)],
                   check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    httpd.shutdown()
    return "research/pdf/%s-v%s.pdf" % (slug, version) if os.path.exists(out) else None

def main():
    check_only = "--check" in sys.argv
    want_pdf = "--pdf" in sys.argv
    with open(LEDGER, encoding="utf-8") as f:
        ledger = json.load(f)
    manifest = {"_about": "Publications manifest, generated by scripts/build_research.py. Do not edit by hand.", "publications": []}
    if os.path.exists(MANIFEST):
        try:
            with open(MANIFEST, encoding="utf-8") as f:
                manifest = json.load(f)
        except Exception:
            pass
    existing = {p["slug"]: p for p in manifest.get("publications", [])}
    os.makedirs(OUT, exist_ok=True)
    problems, built = [], []

    for name in sorted(os.listdir(SRC)):
        if not name.endswith(".md"):
            continue
        with open(os.path.join(SRC, name), encoding="utf-8") as f:
            meta, body = parse_front_matter(f.read())
        slug = meta.get("slug") or name[:-3]
        body_html = resolve_placeholders(md_to_html(resolve_cards(body, ledger, problems)), meta, ledger, problems)
        pdf_rel = existing.get(slug, {}).get("pdf", "")
        if want_pdf and not check_only:
            pass  # built after HTML write below
        changelog = meta.get("changelog") or []
        page = TEMPLATE.format(
            title=html.escape(meta.get("title", slug)),
            subtitle_html=('<p class="lede">%s</p>' % html.escape(meta["subtitle"])) if meta.get("subtitle") else "",
            summary_attr=html.escape(meta.get("summary", ""), quote=True),
            site=SITE, slug=slug, og_image=meta.get("og_image", "assets/photo4.jpg"),
            type_label=html.escape(meta.get("type_label", meta.get("type", "Research"))),
            author=html.escape(meta.get("author", "Nima Imani")),
            date_human=human_date(meta.get("date", "")),
            read_time=html.escape(meta.get("read_time", "")),
            version=html.escape(str(meta.get("version", "1.0"))),
            n=meta.get("n", ledger.get("dataset", {}).get("unique_people", "")),
            waves=meta.get("waves", ledger.get("dataset", {}).get("waves", "")),
            date_range=html.escape(str(meta.get("date_range", ledger.get("dataset", {}).get("date_range", "")))),
            pdf_link=('<a class="btn btn-primary btn-sm" href="../%s">Download PDF (v%s)</a>' % (pdf_rel, meta.get("version"))) if pdf_rel else "",
            body=body_html,
            changelog_html="\n".join("          <li>%s</li>" % html.escape(c) for c in changelog),
            limits=html.escape(ledger.get("dataset", {}).get("limits", "")),
        )
        if not check_only:
            with open(os.path.join(OUT, slug + ".html"), "w", encoding="utf-8") as f:
                f.write(page)
            if want_pdf:
                pdf_rel = build_pdf(slug, meta.get("version", "1.0")) or pdf_rel
                if pdf_rel:  # rewrite with the PDF button now that it exists
                    page = page.replace('<div class="paper-actions">\n          \n', '<div class="paper-actions">\n          <a class="btn btn-primary btn-sm" href="../%s">Download PDF (v%s)</a>\n' % (pdf_rel, meta.get("version")))
                    with open(os.path.join(OUT, slug + ".html"), "w", encoding="utf-8") as f:
                        f.write(page)
        entry = {
            "slug": slug, "title": meta.get("title", slug), "subtitle": meta.get("subtitle", ""),
            "type": meta.get("type", "research"), "type_label": meta.get("type_label", ""),
            "version": str(meta.get("version", "1.0")), "date": meta.get("date", ""),
            "status": meta.get("status", "published"), "n": meta.get("n", ""), "waves": meta.get("waves", ""),
            "summary": meta.get("summary", ""), "url": "research/%s.html" % slug, "pdf": pdf_rel,
            "changelog": changelog, "weight": int(meta.get("weight", 0) or 0),
        }
        existing[slug] = entry
        built.append(slug)
        print("  built %s (v%s, %s)" % (slug, entry["version"], entry["status"]))

    manifest["publications"] = list(existing.values())
    manifest["generated"] = datetime.date.today().isoformat()
    if not check_only:
        with open(MANIFEST, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False)
        # sitemap: add missing research URLs (published only)
        if os.path.exists(SITEMAP):
            with open(SITEMAP, encoding="utf-8") as f:
                sm = f.read()
            add = ["  <url><loc>%s/%s</loc></url>" % (SITE, p["url"]) for p in manifest["publications"]
                   if p["status"] != "draft" and ("%s/%s" % (SITE, p["url"])) not in sm]
            meth = "%s/research/methodology.html" % SITE
            if meth not in sm:
                add.append("  <url><loc>%s</loc></url>" % meth)
            if add:
                sm = sm.replace("</urlset>", "\n".join(add) + "\n</urlset>")
                with open(SITEMAP, "w", encoding="utf-8") as f:
                    f.write(sm)
                print("  sitemap: added %d url(s)" % len(add))
    if problems:
        print("PROBLEMS:"); [print("  - " + p) for p in problems]
        sys.exit(1)
    print("ok — %d publication(s)" % len(built))

if __name__ == "__main__":
    main()

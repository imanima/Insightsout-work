#!/usr/bin/env python3
"""Build the post-event follow-up email (Luma blast + Gmail versions).

Run it after every event. It writes three files under out/ that you paste
or send as they are:

  out/followup-<event>-<date>.luma.txt   paste into the Luma blast composer
  out/followup-<event>-<date>.txt        plain text, for Gmail or anywhere
  out/followup-<event>-<date>.html       rich HTML, for a Gmail draft

The Luma blast is short on purpose (people just saw you; they need the next
date and one link). The Gmail versions carry the full list.

Usage:
  python3 scripts/followup_email.py --event "When Your Role Starts Changing" --date 2026-10-21
  python3 scripts/followup_email.py --event "..." --date ... --note "One sentence about what the room worked on."
  python3 scripts/followup_email.py --event "..." --date ... --events-json events.json   # saved /api/events output
  python3 scripts/followup_email.py --weekly                 # the weekly "This week" letter (out/weekly-<date>.*)
  python3 scripts/followup_email.py --weekly --note "..."    # with your one paragraph at the top

Dates come from the live site (https://insightsout.work/api/events) when the
network allows, otherwise from the static rows in start.html, which the site
keeps current. The event you just ran is left out of the list.
"""
import argparse
import datetime as dt
import html
import json
import os
import re
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://insightsout.work"
API = SITE + "/api/events"
START_PAGE = SITE + "/start"
CALENDAR = "https://luma.com/NimaImani"
BOOK_ME = "https://calendar.app.google/wpqVkuaH1uwFRh6cA"
BOOK_ORG = "https://calendar.app.google/8y9NgWzBLaiT414G6"
COHORTS = SITE + "/cohorts"
TEAL = "#1d6f6a"
MUTED = "#6b7a78"
RULE = "#e3e8e7"

COHORT_LINES = [
    ("Leading Through Uncertainty and Pressure", "for managers and team leads"),
    ("When Your Role Starts Changing", "for anyone whose role is changing"),
    ("Startup on the Side", "for professionals building alongside a job"),
]

FRIDAY = re.compile(r"friday group|building on the side|group coaching|peer support", re.I)


def load_events(events_json):
    """Return [{date: date, time: 'h:mm AM', place, title, url}] sorted by date."""
    if events_json:
        with open(events_json) as f:
            data = json.load(f)
        return [norm_api(e) for e in data.get("events", [])]
    try:
        req = urllib.request.Request(API, headers={"User-Agent": "followup-email/1.0"})
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.load(r)
        evs = [norm_api(e) for e in data.get("events", []) if e.get("name") and e.get("start_at")]
        if evs:
            return evs
    except Exception as err:  # network is blocked in some environments
        print("live calendar not reachable (%s); using start.html" % err, file=sys.stderr)
    return parse_start_page()


def norm_api(e):
    start = dt.datetime.fromisoformat(e["start_at"].replace("Z", "+00:00"))
    try:
        from zoneinfo import ZoneInfo
        start = start.astimezone(ZoneInfo(e.get("timezone") or "America/Los_Angeles"))
    except Exception:
        pass
    addr = e.get("address") or ""
    if e.get("location_type") in ("online", "virtual", "zoom") or "zoom" in addr.lower():
        place = "Online"
    elif re.search(r"laguna|commons", addr, re.I):
        place = "SF Commons"
    else:
        place = addr.split(",")[0].strip() or "San Francisco"
    return {
        "date": start.date(),
        "time": start.strftime("%-I:%M %p"),
        "place": place,
        "title": e["name"],
        "url": e["url"],
    }


def parse_start_page():
    with open(os.path.join(ROOT, "start.html")) as f:
        src = f.read()
    rows = re.findall(
        r'<a class="upcoming-row[^"]*" href="([^"]+)"[^>]*>\s*<time datetime="([^"]+)">[^<]*</time>\s*'
        r'<span class="upcoming-title">([^<]*)</span>\s*(?:<span class="upcoming-meta">([^<]*)</span>)?',
        src,
    )
    out = []
    for url, date, title, meta in rows:
        time, _, place = html.unescape(meta or "").partition(" · ")
        out.append({
            "date": dt.date.fromisoformat(date),
            "time": time.strip() or "",
            "place": place.strip() or "SF Commons",
            "title": html.unescape(title),
            "url": url,
        })
    return out


def short_time(t):
    return re.sub(r":00(?= [AP]M)", "", t)


def when(e):
    return e["date"].strftime("%a, %b %-d").replace(" 0", " ")


def build(args, events):
    today = dt.date.today()
    ran = dt.date.fromisoformat(args.date)
    upcoming = sorted(
        (e for e in events if e["date"] > max(today, ran) or (e["date"] > today and e["date"] != ran)),
        key=lambda e: e["date"],
    )
    upcoming = [e for e in upcoming if not (e["date"] == ran and e["title"].lower() == args.event.lower())]
    workshops = [e for e in upcoming if not FRIDAY.search(e["title"])][: args.limit]
    fridays = [e for e in upcoming if FRIDAY.search(e["title"])][:8]

    event_day = ran.strftime("%A")
    note = (" " + args.note.strip()) if args.note else ""
    opening = "Thanks for joining %s on %s.%s" % (args.event, event_day, note)
    bridge = ("If you want to keep going, here is what is coming up, the small cohorts "
              "starting in January, and a simple way to book time with me.")
    subject = "Thanks for joining %s" % args.event

    # ---------- Luma blast: short ----------
    l = ["Hi,", "", opening, "", "If you want to keep going:", ""]
    for e in workshops[:3]:
        l += ["%s, %s: %s" % (when(e), short_time(e["time"]), e["title"]), e["url"], ""]
    if fridays:
        l += ["Fridays at 2 PM, SF Commons: group coaching and peer support", fridays[0]["url"], ""]
    l += ["Free 30 minute call: " + BOOK_ME, "Cohorts, organizations, everything else: " + START_PAGE, "", "Nima"]
    luma = "\n".join(l)

    # ---------- plain text (Gmail) ----------
    t = []
    t += ["Hi,", "", opening, "", bridge, "", ""]
    t += ["UPCOMING", ""]
    for e in workshops:
        t += ["%s, %s, %s" % (when(e), short_time(e["time"]), e["place"]), e["title"], e["url"], ""]
    if fridays:
        t += ["Fridays at 2 PM, SF Commons: group coaching and peer support"]
        for e in fridays:
            label = e["date"].strftime("%b %-d")
            extra = " (Building on the Side, for working professionals)" if re.search(r"building on the side", e["title"], re.I) else ""
            t += ["%s%s: %s" % (label, extra, e["url"])]
        t += [""]
    t += ["Full calendar: " + CALENDAR, "", ""]
    t += ["BOOK TIME", "", "For you: a free 30 minute coaching call", BOOK_ME, "",
          "For your team or organization: a free conversation", BOOK_ORG, "", ""]
    t += ["COHORTS, STARTING JANUARY", ""]
    t += ["%s, %s" % (n, who) for n, who in COHORT_LINES]
    t += ["", "See the cohorts and apply: " + COHORTS, "", ""]
    t += ["All of this, on one page: " + START_PAGE, "", "Nima", "",
          "Nima Imani", "ICF Associate Certified Coach, InsightsOut", "San Francisco and online", SITE]
    text = "\n".join(t)

    # ---------- HTML ----------
    def a(href, label, weight="700", color=TEAL):
        return '<a href="%s" style="color:%s;font-weight:%s;text-decoration:none;">%s</a>' % (href, color, weight, html.escape(label))

    def heading(label, first=False):
        pad = "22px 0 12px"
        return ('<tr><td style="padding:%s;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;'
                'color:%s;font-weight:700;border-top:1px solid %s;">%s</td></tr>' % (pad, MUTED, RULE, label))

    cell = "padding:10px 12px 10px 0;border-bottom:1px solid #eef1f0;"
    rows = []
    for e in workshops:
        rows.append(
            '<tr><td width="128" valign="top" style="%sfont-weight:700;white-space:nowrap;">%s</td>'
            '<td valign="top" style="%s">%s<br><span style="color:%s;font-size:13.5px;">%s &middot; %s</span></td>'
            '<td width="70" valign="top" align="right" style="padding:10px 0;border-bottom:1px solid #eef1f0;">%s</td></tr>'
            % (cell, when(e), cell, html.escape(e["title"]), MUTED, short_time(e["time"]), html.escape(e["place"]),
               a(e["url"], "Register"))
        )
    if fridays:
        links = []
        for e in fridays:
            links.append(a(e["url"], e["date"].strftime("%b %-d")) + (
                ' <span style="color:%s;">(Building on the Side, for working professionals)</span>' % MUTED
                if re.search(r"building on the side", e["title"], re.I) else ""))
        rows.append(
            '<tr><td valign="top" style="padding:10px 12px 10px 0;font-weight:700;white-space:nowrap;">Fridays, 2 PM</td>'
            '<td colspan="2" valign="top" style="padding:10px 0;">Group coaching and peer support, SF Commons<br>'
            '<span style="font-size:13.5px;line-height:1.9;">%s</span></td></tr>' % " &middot; ".join(links)
        )
    cohort_html = "<br>\n".join(
        "<strong>%s</strong> <span style=\"color:%s;\">%s</span>" % (html.escape(n), MUTED, html.escape(who))
        for n, who in COHORT_LINES)

    page = """<!DOCTYPE html>
<html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#ffffff;">
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;">
<tr><td align="center" style="padding:24px 16px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1f2a2a;font-size:16px;line-height:1.5;">
<tr><td style="padding:0 0 8px;">Hi,</td></tr>
<tr><td style="padding:0 0 14px;">%(opening)s</td></tr>
<tr><td style="padding:0 0 28px;">%(bridge)s</td></tr>
%(h_up)s
<tr><td style="padding:0 0 6px;"><table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0" style="font-size:15px;">
%(rows)s
</table></td></tr>
<tr><td style="padding:4px 0 30px;font-size:14px;">%(cal)s</td></tr>
%(h_book)s
<tr><td style="padding:0 0 10px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="background:%(teal)s;border-radius:6px;"><a href="%(book_me)s" style="display:inline-block;padding:12px 18px;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;">Free 30 minute coaching call</a></td>
</tr></table></td></tr>
<tr><td style="padding:0 0 30px;font-size:15px;">For your team or organization: %(book_org)s</td></tr>
%(h_cohorts)s
<tr><td style="padding:0 0 14px;font-size:15px;line-height:1.7;">
%(cohorts)s
</td></tr>
<tr><td style="padding:0 0 30px;font-size:15px;">%(cohorts_link)s</td></tr>
<tr><td style="padding:22px 0 0;border-top:1px solid %(rule)s;font-size:15px;">All of this, on one page: %(start)s</td></tr>
<tr><td style="padding:28px 0 0;">Nima</td></tr>
<tr><td style="padding:14px 0 0;font-size:13px;line-height:1.6;color:%(muted)s;">Nima Imani<br>ICF Associate Certified Coach, InsightsOut<br>San Francisco and online<br><a href="%(site)s" style="color:%(muted)s;">insightsout.work</a></td></tr>
</table></td></tr></table></body></html>
""" % {
        "opening": html.escape(opening), "bridge": html.escape(bridge),
        "h_up": heading("Upcoming"), "rows": "\n".join(rows),
        "cal": a(CALENDAR, "Full calendar on Luma →"),
        "h_book": heading("Book time"), "teal": TEAL, "book_me": BOOK_ME,
        "book_org": a(BOOK_ORG, "book a conversation →"),
        "h_cohorts": heading("Cohorts, starting January"), "cohorts": cohort_html,
        "cohorts_link": a(COHORTS, "See the cohorts and apply →"),
        "rule": RULE, "start": a(START_PAGE, "insightsout.work/start"),
        "muted": MUTED, "site": SITE,
    }
    return subject, luma, text, page


def build_weekly(args, events):
    """The weekly letter: this week's dates, what is coming, one link."""
    today = dt.date.today()
    week_end = today + dt.timedelta(days=7)
    upcoming = sorted((e for e in events if e["date"] >= today), key=lambda e: e["date"])
    this_week = [e for e in upcoming if e["date"] < week_end]
    later = [e for e in upcoming if e["date"] >= week_end and not FRIDAY.search(e["title"])][:4]
    first = next((e for e in this_week if not FRIDAY.search(e["title"])), this_week[0] if this_week else None)
    subject = "This week: %s" % first["title"] if first else "This week at InsightsOut"
    note = args.note.strip() if args.note else "[ONE SHORT PARAGRAPH: something you noticed this week, in a room or in your own work. Three to five sentences. No lesson required.]"

    t = ["Hi,", "", note, "", "THIS WEEK", ""]
    for e in this_week:
        t += ["%s, %s, %s" % (when(e), short_time(e["time"]), e["place"]), e["title"], e["url"], ""]
    if later:
        t += ["COMING UP", ""]
        for e in later:
            t += ["%s: %s" % (when(e), e["title"]), e["url"], ""]
    t += ["Fridays at 2 PM, SF Commons: group coaching and peer support, every week. " + CALENDAR, "",
          "Ways to work with me, one page: " + START_PAGE, "",
          "Reply to this email if something here landed. I read every reply.", "", "Nima"]
    text = "\n".join(t)

    def a(href, label):
        return '<a href="%s" style="color:%s;font-weight:700;text-decoration:none;">%s</a>' % (href, TEAL, html.escape(label))
    cell = "padding:10px 12px 10px 0;border-bottom:1px solid #eef1f0;"
    rows = "".join(
        '<tr><td width="128" valign="top" style="%sfont-weight:700;white-space:nowrap;">%s</td>'
        '<td valign="top" style="%s">%s<br><span style="color:%s;font-size:13.5px;">%s &middot; %s</span></td>'
        '<td width="70" valign="top" align="right" style="padding:10px 0;border-bottom:1px solid #eef1f0;">%s</td></tr>'
        % (cell, when(e), cell, html.escape(e["title"]), MUTED, short_time(e["time"]), html.escape(e["place"]), a(e["url"], "Register"))
        for e in this_week)
    later_html = "<br>".join("%s: %s" % (when(e), a(e["url"], e["title"])) for e in later)
    heading = ('<tr><td style="padding:22px 0 12px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;'
               'color:%s;font-weight:700;border-top:1px solid %s;">%%s</td></tr>' % (MUTED, RULE))
    page = """<!DOCTYPE html>
<html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#ffffff;">
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:24px 16px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1f2a2a;font-size:16px;line-height:1.5;">
<tr><td style="padding:0 0 8px;">Hi,</td></tr>
<tr><td style="padding:0 0 28px;">%(note)s</td></tr>
%(h1)s
<tr><td><table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0" style="font-size:15px;">%(rows)s</table></td></tr>
%(h2)s
<tr><td style="padding:0 0 10px;font-size:15px;line-height:1.8;">%(later)s</td></tr>
<tr><td style="padding:10px 0 30px;font-size:15px;">Fridays at 2 PM, SF Commons: group coaching and peer support, every week. %(cal)s</td></tr>
<tr><td style="padding:22px 0 0;border-top:1px solid %(rule)s;font-size:15px;">Ways to work with me, one page: %(start)s</td></tr>
<tr><td style="padding:18px 0 0;font-size:15px;">Reply to this email if something here landed. I read every reply.</td></tr>
<tr><td style="padding:28px 0 0;">Nima</td></tr>
</table></td></tr></table></body></html>
""" % {"note": html.escape(note), "h1": heading % "This week", "rows": rows,
       "h2": heading % "Coming up", "later": later_html,
       "cal": a(CALENDAR, "Full calendar \u2192"), "rule": RULE, "start": a(START_PAGE, "insightsout.work/start")}
    return subject, text, page


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--event", help="name of the event you just ran")
    ap.add_argument("--date", help="date you ran it, YYYY-MM-DD")
    ap.add_argument("--weekly", action="store_true", help="build the weekly letter instead of a follow-up")
    ap.add_argument("--note", default="", help="optional sentence about what the room worked on")
    ap.add_argument("--events-json", help="saved output of /api/events instead of fetching")
    ap.add_argument("--limit", type=int, default=4, help="how many dated workshops to list (default 4)")
    ap.add_argument("--out", default=os.path.join(ROOT, "out"), help="output folder (default out/)")
    args = ap.parse_args()

    events = load_events(args.events_json)
    os.makedirs(args.out, exist_ok=True)

    if args.weekly:
        subject, text, page = build_weekly(args, events)
        base = os.path.join(args.out, "weekly-%s" % dt.date.today().isoformat())
        with open(base + ".txt", "w") as f:
            f.write("Subject: %s\n\n%s\n" % (subject, text))
        with open(base + ".html", "w") as f:
            f.write(page)
        print("Subject: " + subject + "\n\n" + text)
        print("\nwrote %s.txt, .html" % base, file=sys.stderr)
        return

    if not (args.event and args.date):
        ap.error("--event and --date are required unless --weekly")
    subject, luma, text, page = build(args, events)
    slug = re.sub(r"[^a-z0-9]+", "-", args.event.lower()).strip("-")
    base = os.path.join(args.out, "followup-%s-%s" % (slug, args.date))
    with open(base + ".luma.txt", "w") as f:
        f.write(luma + "\n")
    with open(base + ".txt", "w") as f:
        f.write("Subject: %s\n\n%s\n" % (subject, text))
    with open(base + ".html", "w") as f:
        f.write(page)

    print("Subject: " + subject)
    print()
    print("=== Luma blast (short) ===")
    print(luma)
    print()
    print("=== Gmail version is in %s.txt and .html ===" % base)
    print("wrote %s.luma.txt, .txt, .html" % base, file=sys.stderr)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Refresh data/events.json from the Luma API.

Usage:
    LUMA_API_KEY=... python3 scripts/fetch_luma_events.py
or, to reuse the key from the Luma data reader project:
    set -a; source "../Luma data reader/.env"; set +a
    python3 scripts/fetch_luma_events.py

Run this whenever events change (or wire it into a cron / build step).

This writes the historical event record, not the live calendar. Live dates
on the site come from /api/events (see api/events.js). data/events.json is
read by js/research.js and articles/event-record-2026.html; if the file is
stale or missing, those pages fall back to the public Luma calendar link.
"""
import json
import os
import sys
import urllib.request

LUMA_BASE = "https://api.lu.ma/public/v1"
OUT = os.path.join(os.path.dirname(__file__), "..", "data", "events.json")


def main():
    key = os.environ.get("LUMA_API_KEY")
    if not key:
        sys.exit("LUMA_API_KEY not set — see usage in the file header.")

    req = urllib.request.Request(
        f"{LUMA_BASE}/calendar/list-events?pagination_limit=50",
        headers={
            "x-luma-api-key": key,
            # Luma's CDN rejects the default urllib user agent
            "User-Agent": "insightsout-site-build/1.0",
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(req) as r:
        entries = json.load(r)["entries"]

    events = []
    for e in entries:
        ev = e.get("event", e)
        events.append({
            "name": ev.get("name"),
            "start_at": ev.get("start_at"),
            "url": ev.get("url"),
            "timezone": ev.get("timezone"),
            "location_type": "online" if ev.get("meeting_url") else "in_person",
            "description": (ev.get("description") or "")[:140],
        })
    events.sort(key=lambda x: x["start_at"] or "")

    with open(OUT, "w") as f:
        json.dump(events, f, indent=1)
    print(f"Wrote {len(events)} events to {os.path.normpath(OUT)}")


if __name__ == "__main__":
    main()

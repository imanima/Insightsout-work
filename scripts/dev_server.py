#!/usr/bin/env python3
"""Local static server with a live /api/events proxy to Luma.

    python3 scripts/dev_server.py 8642
"""
from __future__ import annotations

import json
import os
import sys
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CALENDAR_ID = "cal-cHPs3Da3iGJZspe"
LUMA_URL = (
    "https://api.lu.ma/calendar/get-items"
    f"?calendar_api_id={CALENDAR_ID}&period=future"
)


def luma_events():
    req = urllib.request.Request(
        LUMA_URL,
        headers={
            "Accept": "application/json",
            "User-Agent": "insightsout-site/1.0",
        },
    )
    with urllib.request.urlopen(req, timeout=12) as response:
        payload = json.load(response)
    events = []
    for entry in payload.get("entries") or []:
        ev = entry.get("event") or {}
        geo = ev.get("geo_address_info") or {}
        url = ev.get("url") or ""
        if url and not url.startswith("http"):
            url = "https://luma.com/" + url.lstrip("/")
        events.append({
            "name": ev.get("name"),
            "start_at": ev.get("start_at"),
            "url": url,
            "timezone": ev.get("timezone") or "America/Los_Angeles",
            "location_type": ev.get("location_type") or "offline",
            "address": geo.get("address") or "",
        })
    return events


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path == "/api/events":
            try:
                body = json.dumps({"ok": True, "events": luma_events()}).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Cache-Control", "public, max-age=60")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            except Exception as exc:
                body = json.dumps({"ok": False, "error": "luma_unreachable"}).encode("utf-8")
                self.send_response(502)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                sys.stderr.write(f"luma proxy failed: {exc}\n")
            return
        return super().do_GET()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8642
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"Serving {ROOT} at http://127.0.0.1:{port}")
    server.serve_forever()


if __name__ == "__main__":
    main()

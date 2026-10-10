// /api/events — live Luma calendar for the website.
// Public get-items endpoint (no API key). Guest/partner events are included
// in the payload; js/events.js keeps them off the home and Events lists.

const CALENDAR_ID = "cal-cHPs3Da3iGJZspe";
const LUMA_URL =
  "https://api.lu.ma/calendar/get-items?calendar_api_id=" +
  CALENDAR_ID +
  "&period=future";
const ALLOWED_ORIGINS = [
  "https://insightsout.work",
  "https://www.insightsout.work",
  "http://localhost:8642"
];

function cors(req, res) {
  const origin = req.headers.origin || "";
  if (ALLOWED_ORIGINS.includes(origin) || /\.vercel\.app$/.test(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
}

function lumaUrl(slug) {
  if (!slug) return "";
  if (/^https?:/i.test(slug)) return slug;
  return "https://luma.com/" + String(slug).replace(/^\//, "");
}

function normalize(entry) {
  const ev = (entry && entry.event) || {};
  const geo = ev.geo_address_info || {};
  return {
    name: ev.name || "",
    start_at: ev.start_at || "",
    url: lumaUrl(ev.url),
    timezone: ev.timezone || "America/Los_Angeles",
    location_type: ev.location_type || "offline",
    address: geo.address || ""
  };
}

module.exports = async function handler(req, res) {
  cors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "method_not_allowed" });

  try {
    const luma = await fetch(LUMA_URL, {
      headers: {
        Accept: "application/json",
        "User-Agent": "insightsout-site/1.0"
      }
    });
    if (!luma.ok) {
      const text = await luma.text();
      console.error("luma get-items failed", luma.status, text.slice(0, 300));
      return res.status(502).json({ ok: false, error: "luma_error" });
    }
    const data = await luma.json();
    const events = (data.entries || []).map(normalize).filter(function (e) {
      return e.name && e.start_at;
    });
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=1800");
    return res.status(200).json({ ok: true, events: events });
  } catch (err) {
    console.error("luma get-items exception", err && err.message);
    return res.status(502).json({ ok: false, error: "luma_unreachable" });
  }
};

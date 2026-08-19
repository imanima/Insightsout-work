// /api/subscribe — Vercel serverless function.
// Adds a website subscriber to the InsightsOut Luma calendar (People list)
// via the Luma Public API (requires Luma Plus). The API key lives ONLY in the
// Vercel environment variable LUMA_API_KEY — never in client-side JS.
//
// Request  (POST, JSON): { email, name?, source?, interest? }
// Response (JSON):       { ok: true } | { ok: false, error }
//
// Tags: the `source` value (e.g. "website", "coaching", "research",
// "community") is applied as a Luma tag IF that tag already exists on the
// calendar (Luma will not create tags via this endpoint). If tagging fails,
// we retry once without tags so the subscription still succeeds.

const LUMA_IMPORT_URL = "https://public-api.luma.com/v1/calendar/import-people";
const ALLOWED_ORIGINS = [
  "https://insightsout.work",
  "https://www.insightsout.work",
  "http://localhost:8642"
];
const ALLOWED_TAGS = ["website", "coaching", "research", "community", "organizations", "home"];

function cors(req, res) {
  const origin = req.headers.origin || "";
  if (ALLOWED_ORIGINS.includes(origin) || /\.vercel\.app$/.test(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function isEmail(s) {
  return typeof s === "string" && s.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
}

async function lumaImport(apiKey, person, tagNames) {
  const body = { infos: [person] };
  if (tagNames && tagNames.length) body.tag_names = tagNames;
  const r = await fetch(LUMA_IMPORT_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "x-luma-api-key": apiKey },
    body: JSON.stringify(body)
  });
  const text = await r.text();
  return { ok: r.ok, status: r.status, text };
}

module.exports = async function handler(req, res) {
  cors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "method_not_allowed" });

  const apiKey = process.env.LUMA_API_KEY;
  if (!apiKey) return res.status(500).json({ ok: false, error: "server_not_configured" });

  let data = req.body;
  if (typeof data === "string") { try { data = JSON.parse(data); } catch (e) { data = {}; } }
  data = data || {};

  // Honeypot: real users never fill this.
  if (data.website_url) return res.status(200).json({ ok: true });

  const email = String(data.email || "").trim().toLowerCase();
  if (!isEmail(email)) return res.status(400).json({ ok: false, error: "invalid_email" });

  const person = { email };
  const name = String(data.name || "").trim().slice(0, 120);
  if (name) person.name = name;

  const source = String(data.source || "website").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  const tags = ALLOWED_TAGS.includes(source) ? [source] : ["website"];

  try {
    let result = await lumaImport(apiKey, person, tags);
    if (!result.ok && result.status < 500) {
      // Most likely a missing tag — retry untagged so we never lose the subscriber.
      result = await lumaImport(apiKey, person, []);
    }
    if (result.ok) return res.status(200).json({ ok: true });
    console.error("luma import failed", result.status, result.text.slice(0, 300));
    return res.status(502).json({ ok: false, error: "luma_error" });
  } catch (err) {
    console.error("luma import exception", err && err.message);
    return res.status(502).json({ ok: false, error: "luma_unreachable" });
  }
};

// /api/inbox — Vercel serverless function.
// Receives the website's native forms (reviews, introductions) and files each
// submission as one issue in a PRIVATE GitHub repository, so Nima gets an
// email per submission and nothing is public.
//
// Environment (Vercel project settings):
//   INBOX_GITHUB_TOKEN  fine-grained token with Issues: read and write on the inbox repo
//   INBOX_REPO          "owner/name" of the private repo (default imanima/insightsout-inbox)
//
// Request  (POST, JSON): { kind: "review" | "introduce", ...fields, website: "" }
// Response (JSON):       { ok: true } | { ok: false, error }

const ALLOWED_ORIGINS = [
  "https://insightsout.work",
  "https://www.insightsout.work",
  "http://localhost:8642"
];
const MAX = { short: 200, long: 4000 };

const KINDS = {
  review: {
    required: ["name", "role", "program", "words", "permission", "email"],
    fields: ["name", "role", "program", "words", "permission", "linkedin_ok", "email", "source", "page"],
    title: (f) => `Review: ${f.name} (${f.program})`,
    labels: ["review"]
  },
  introduce: {
    required: ["name", "email", "their_name", "situation", "mention"],
    fields: ["name", "email", "their_name", "situation", "reach", "mention", "source", "page"],
    title: (f) => `Introduction: ${f.name} suggests ${f.their_name}`,
    labels: ["introduction"]
  }
};

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

function clean(v, max) {
  if (v === undefined || v === null) return "";
  return String(v).replace(/\r/g, "").trim().slice(0, max);
}

function body(kind, f) {
  const lines = [`**Kind:** ${kind}`, `**Received:** ${new Date().toISOString()}`, ""];
  for (const k of KINDS[kind].fields) {
    if (!f[k]) continue;
    const v = f[k].includes("\n") ? "\n\n" + f[k].replace(/^/gm, "> ") : " " + f[k];
    lines.push(`**${k}:**${v}`, "");
  }
  lines.push("_Filed by insightsout.work/api/inbox. Publish only with the permission chosen above._");
  return lines.join("\n");
}

module.exports = async function handler(req, res) {
  cors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "method_not_allowed" });

  const token = process.env.INBOX_GITHUB_TOKEN;
  const repo = process.env.INBOX_REPO || "imanima/insightsout-inbox";
  if (!token) return res.status(503).json({ ok: false, error: "server_not_configured" });

  let data = req.body;
  if (typeof data === "string") { try { data = JSON.parse(data); } catch (e) { data = {}; } }
  data = data || {};

  // Honeypot: real users never fill this.
  if (data.website) return res.status(200).json({ ok: true });

  const kind = KINDS[data.kind] ? data.kind : null;
  if (!kind) return res.status(400).json({ ok: false, error: "bad_kind" });

  const f = {};
  for (const k of KINDS[kind].fields) f[k] = clean(data[k], k === "words" || k === "situation" ? MAX.long : MAX.short);
  for (const k of KINDS[kind].required) if (!f[k]) return res.status(400).json({ ok: false, error: "missing_" + k });
  if (!isEmail(f.email)) return res.status(400).json({ ok: false, error: "bad_email" });

  const r = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: "POST",
    headers: {
      "authorization": "Bearer " + token,
      "accept": "application/vnd.github+json",
      "content-type": "application/json",
      "user-agent": "insightsout-inbox"
    },
    body: JSON.stringify({ title: KINDS[kind].title(f).slice(0, 200), body: body(kind, f), labels: KINDS[kind].labels })
  });
  if (!r.ok) {
    const text = await r.text();
    console.error("inbox: github " + r.status + " " + text.slice(0, 300));
    return res.status(502).json({ ok: false, error: "inbox_unavailable" });
  }
  return res.status(200).json({ ok: true });
};

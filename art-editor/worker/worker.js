/* ============================================================
   A.R.T Site Editor — backend (Cloudflare Worker)
   ------------------------------------------------------------
   - Password login (issues a signed session).
   - Commits Events/News edits + image uploads to the site's repo.
   - Auto-fill helpers (free, via Cloudflare Workers AI + page metadata):
       /api/parse-url     news URL  -> {headline, summary, source, image, ...}
       /api/parse-poster  poster    -> uploads it + {name, date, venue, lineup}
     Auto-fill only PRE-FILLS a draft; the editor reviews before saving.

   Config (Worker "Variables & Secrets"):
     Secrets:  GH_TOKEN, EDITOR_PASSWORD, SESSION_SECRET
     Variables: GH_OWNER, GH_REPO, GH_BRANCH, SITE_DIR, ALLOWED_ORIGIN
   Binding (for auto-fill):  Workers AI, variable name  AI
   ============================================================ */

const enc = new TextEncoder();
const b64url = (buf) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(msg)));
}
function safeEqual(a, b) {
  const ba = enc.encode(a), bb = enc.encode(b);
  if (ba.length !== bb.length) return false;
  let out = 0;
  for (let i = 0; i < ba.length; i++) out |= ba[i] ^ bb[i];
  return out === 0;
}
async function issueSession(env) {
  const exp = Date.now() + 8 * 60 * 60 * 1000;
  const payload = b64url(enc.encode(JSON.stringify({ exp })));
  return payload + "." + (await hmac(env.SESSION_SECRET, payload));
}
async function validSession(env, token) {
  if (!token || token.indexOf(".") < 0) return false;
  const [payload, sig] = token.split(".");
  if (!safeEqual(sig, await hmac(env.SESSION_SECRET, payload))) return false;
  try {
    const { exp } = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof exp === "number" && Date.now() < exp;
  } catch { return false; }
}

function cors(env) {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}
function json(env, status, obj) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...cors(env) } });
}

// ---- GitHub ----
function ghHeaders(env) {
  return { Authorization: `Bearer ${env.GH_TOKEN}`, Accept: "application/vnd.github+json", "User-Agent": "art-site-editor", "X-GitHub-Api-Version": "2022-11-28" };
}
async function ghGetSha(env, path) {
  const r = await fetch(`https://api.github.com/repos/${env.GH_OWNER}/${env.GH_REPO}/contents/${path}?ref=${env.GH_BRANCH}`, { headers: ghHeaders(env) });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`GitHub GET ${path}: ${r.status}`);
  return (await r.json()).sha;
}
async function ghPut(env, path, contentB64, message) {
  const sha = await ghGetSha(env, path);
  const body = { message, content: contentB64, branch: env.GH_BRANCH };
  if (sha) body.sha = sha;
  const r = await fetch(`https://api.github.com/repos/${env.GH_OWNER}/${env.GH_REPO}/contents/${path}`, { method: "PUT", headers: ghHeaders(env), body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`GitHub PUT ${path}: ${r.status} ${(await r.text()).slice(0, 160)}`);
  return true;
}
function b64FromBytes(bytes) {
  let bin = ""; for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
const utf8ToB64 = (s) => b64FromBytes(enc.encode(s));

async function commitImage(env, filename, b64) {
  let safe = String(filename || "image.jpg").toLowerCase().replace(/[^a-z0-9._-]/g, "-").replace(/^-+/, "").slice(-80);
  if (!/\.(jpe?g|png|webp|gif)$/.test(safe)) safe += ".jpg";
  const dir = env.SITE_DIR ? env.SITE_DIR + "/" : "";
  const stamped = Date.now().toString(36) + "-" + safe;
  await ghPut(env, `${dir}assets/img/uploads/${stamped}`, b64, `Editor: image ${stamped}`);
  return `assets/img/uploads/${stamped}`;
}

// ---- helpers for auto-fill ----
function decodeEntities(s) {
  return String(s || "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&#x27;/gi, "'").replace(/&apos;/g, "'").replace(/&nbsp;/g, " ");
}
function metaTag(html, prop) {
  const a = html.match(new RegExp('<meta[^>]+(?:property|name)=["\']' + prop + '["\'][^>]*content=["\']([^"\']*)["\']', "i"));
  if (a) return decodeEntities(a[1]);
  const b = html.match(new RegExp('<meta[^>]+content=["\']([^"\']*)["\'][^>]*(?:property|name)=["\']' + prop + '["\']', "i"));
  return b ? decodeEntities(b[1]) : "";
}
async function downloadImage(env, imgUrl) {
  const r = await fetch(imgUrl, { headers: { "User-Agent": "Mozilla/5.0 (art-site-editor)" } });
  if (!r.ok) return "";
  const ct = r.headers.get("content-type") || "";
  if (!/image\//.test(ct)) return "";
  const buf = new Uint8Array(await r.arrayBuffer());
  if (!buf.length || buf.length > 3_000_000) return "";
  const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : ct.includes("gif") ? "gif" : "jpg";
  return commitImage(env, "news-image." + ext, b64FromBytes(buf));
}

const TYPE_PATHS = { events: "data/art-events.json", news: "data/art-news.json" };

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: cors(env) });
    const url = new URL(request.url);
    try {
      if (url.pathname === "/api/login" && request.method === "POST") {
        const { password } = await request.json();
        await new Promise((r) => setTimeout(r, 300));
        if (!password || !safeEqual(String(password), env.EDITOR_PASSWORD)) return json(env, 401, { error: "Wrong password" });
        return json(env, 200, { token: await issueSession(env) });
      }

      const auth = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
      if (!(await validSession(env, auth))) return json(env, 401, { error: "Not logged in" });

      if (url.pathname === "/api/save" && request.method === "POST") {
        const { type, data } = await request.json();
        const path = TYPE_PATHS[type];
        if (!path) return json(env, 400, { error: "Unknown content type" });
        const content = JSON.stringify({ [type]: data[type] ?? data }, null, 2) + "\n";
        await ghPut(env, path, utf8ToB64(content), `Editor: update ${type}`);
        return json(env, 200, { ok: true });
      }

      if (url.pathname === "/api/upload" && request.method === "POST") {
        const { filename, dataBase64 } = await request.json();
        if (!/\.(jpe?g|png|webp|gif)$/i.test(filename || "")) return json(env, 400, { error: "Need a .jpg/.png/.webp/.gif file" });
        const path = await commitImage(env, filename, (dataBase64 || "").replace(/^data:[^;]+;base64,/, ""));
        return json(env, 200, { path });
      }

      // ---- auto-fill: news from a URL (page metadata; no AI needed) ----
      if (url.pathname === "/api/parse-url" && request.method === "POST") {
        const raw = String((await request.json()).url || "").trim();
        if (!raw) return json(env, 400, { error: "Paste a link first" });
        const full = /^https?:\/\//i.test(raw) ? raw : "https://" + raw.replace(/^\/+/, "");
        const res = await fetch(full, { headers: { "User-Agent": "Mozilla/5.0 (art-site-editor)" }, redirect: "follow" });
        if (!res.ok) return json(env, 502, { error: `Couldn't open that link (${res.status})` });
        const html = (await res.text()).slice(0, 600000);
        const host = new URL(res.url || full).hostname.replace(/^www\./, "");
        let headline = metaTag(html, "og:title") || decodeEntities((html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || "").trim();
        headline = headline.replace(/\s*[|–—-]\s*[^|–—-]{1,40}$/, "").trim(); // drop " | Site" suffix
        let summary = metaTag(html, "og:description") || metaTag(html, "description") || "";
        if (summary.length > 170) summary = summary.slice(0, 167).replace(/\s+\S*$/, "") + "…";
        let image = "";
        const og = metaTag(html, "og:image") || metaTag(html, "twitter:image");
        if (og) { try { image = await downloadImage(env, new URL(og, res.url || full).href); } catch {} }
        const source = metaTag(html, "og:site_name") || host;
        return json(env, 200, { label: "", headline, summary, source, link: full, image, image_alt: headline ? headline.slice(0, 80) : "Article image" });
      }

      // ---- auto-fill: event from a poster (Workers AI vision; graceful) ----
      if (url.pathname === "/api/parse-poster" && request.method === "POST") {
        const { filename, dataBase64 } = await request.json();
        const clean = (dataBase64 || "").replace(/^data:[^;]+;base64,/, "");
        if (!clean) return json(env, 400, { error: "No image" });
        const poster = await commitImage(env, filename || "poster.jpg", clean);

        let f = {};
        if (env.AI) {
          const bytes = Uint8Array.from(atob(clean), (c) => c.charCodeAt(0));
          const prompt =
            "This is a concert/event poster. Read it and reply with ONLY a JSON object, no other text: " +
            '{"name":"","date_display":"","venue":"","lineup":""}. ' +
            "name = the main event or festival name. date_display = the date(s) exactly as printed. " +
            "venue = venue and city. lineup = the artists/acts listed, comma-separated. " +
            "Use an empty string for anything you cannot read.";
          const models = ["@cf/meta/llama-3.2-11b-vision-instruct", "@cf/llava-hf/llava-1.5-7b-hf"];
          for (const model of models) {
            try {
              const out = await env.AI.run(model, { image: [...bytes], prompt, max_tokens: 512 });
              const text = out.response || out.description || (typeof out === "string" ? out : "");
              const m = text.match(/\{[\s\S]*\}/);
              if (m) { f = JSON.parse(m[0]); break; }
            } catch (e) { /* try next model, then fall through to manual */ }
          }
        }
        return json(env, 200, {
          poster,
          poster_alt: f.name ? "Poster for " + f.name : "Event poster",
          eyebrow: "Upcoming",
          name: f.name || "",
          date_display: f.date_display || "",
          venue: f.venue || "",
          lineup: f.lineup || "",
          tickets_url: "",
          _ai: !!env.AI,
        });
      }

      return json(env, 404, { error: "Not found" });
    } catch (e) {
      return json(env, 500, { error: String(e.message || e) });
    }
  },
};

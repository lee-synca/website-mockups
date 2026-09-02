/* ============================================================
   A.R.T Site Editor — backend (Cloudflare Worker)
   ------------------------------------------------------------
   Gives the band a password login and commits their edits to the
   site's GitHub repo (which rebuilds the site). The GitHub token
   lives only here, server-side — the app never sees it.

   Config (Worker "Variables & Secrets"):
     Secrets:
       GH_TOKEN         Fine-grained GitHub PAT, Contents: Read & Write, THIS repo only
       EDITOR_PASSWORD  The shared password the band types to log in
       SESSION_SECRET   Any long random string (signs login sessions)
     Plain variables:
       GH_OWNER         e.g. lee-synca   (change when the site moves repos)
       GH_REPO          e.g. website-mockups
       GH_BRANCH        e.g. main
       SITE_DIR         e.g. art         (the site's folder in the repo; "" if at root)
       ALLOWED_ORIGIN   e.g. https://mockups.getsynca.com.au

   Data files it writes:  <root>/data/art-events.json, /data/art-news.json
   Images it writes:      <SITE_DIR>/assets/img/uploads/<file>
   ============================================================ */

const enc = new TextEncoder();
const b64url = (buf) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(msg)));
}

// constant-time string compare
function safeEqual(a, b) {
  const ba = enc.encode(a), bb = enc.encode(b);
  if (ba.length !== bb.length) return false;
  let out = 0;
  for (let i = 0; i < ba.length; i++) out |= ba[i] ^ bb[i];
  return out === 0;
}

async function issueSession(env) {
  const exp = Date.now() + 8 * 60 * 60 * 1000; // 8 hours
  const payload = b64url(enc.encode(JSON.stringify({ exp })));
  const sig = await hmac(env.SESSION_SECRET, payload);
  return payload + "." + sig;
}

async function validSession(env, token) {
  if (!token || token.indexOf(".") < 0) return false;
  const [payload, sig] = token.split(".");
  const expect = await hmac(env.SESSION_SECRET, payload);
  if (!safeEqual(sig, expect)) return false;
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
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...cors(env) },
  });
}

// ---- GitHub helpers ----
function ghHeaders(env) {
  return {
    Authorization: `Bearer ${env.GH_TOKEN}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "art-site-editor",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}
async function ghGetSha(env, path) {
  const url = `https://api.github.com/repos/${env.GH_OWNER}/${env.GH_REPO}/contents/${path}?ref=${env.GH_BRANCH}`;
  const r = await fetch(url, { headers: ghHeaders(env) });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`GitHub GET ${path}: ${r.status}`);
  return (await r.json()).sha;
}
async function ghPut(env, path, contentB64, message) {
  const sha = await ghGetSha(env, path);
  const url = `https://api.github.com/repos/${env.GH_OWNER}/${env.GH_REPO}/contents/${path}`;
  const body = { message, content: contentB64, branch: env.GH_BRANCH };
  if (sha) body.sha = sha;
  const r = await fetch(url, { method: "PUT", headers: ghHeaders(env), body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`GitHub PUT ${path}: ${r.status} ${(await r.text()).slice(0, 160)}`);
  return true;
}
const utf8ToB64 = (s) => b64FromBytes(enc.encode(s));
function b64FromBytes(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

const TYPE_PATHS = { events: "data/art-events.json", news: "data/art-news.json" };

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: cors(env) });
    const url = new URL(request.url);

    try {
      // --- login ---
      if (url.pathname === "/api/login" && request.method === "POST") {
        const { password } = await request.json();
        // small delay blunts brute-forcing
        await new Promise((r) => setTimeout(r, 300));
        if (!password || !safeEqual(String(password), env.EDITOR_PASSWORD)) {
          return json(env, 401, { error: "Wrong password" });
        }
        return json(env, 200, { token: await issueSession(env) });
      }

      // everything below needs a valid session
      const auth = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
      if (!(await validSession(env, auth))) return json(env, 401, { error: "Not logged in" });

      // --- save events/news JSON ---
      if (url.pathname === "/api/save" && request.method === "POST") {
        const { type, data } = await request.json();
        const path = TYPE_PATHS[type];
        if (!path) return json(env, 400, { error: "Unknown content type" });
        const key = type; // { events: [...] } or { news: [...] }
        const content = JSON.stringify({ [key]: data[key] ?? data }, null, 2) + "\n";
        await ghPut(env, path, utf8ToB64(content), `Editor: update ${type}`);
        return json(env, 200, { ok: true });
      }

      // --- upload image ---
      if (url.pathname === "/api/upload" && request.method === "POST") {
        const { filename, dataBase64 } = await request.json();
        const safe = String(filename || "").toLowerCase().replace(/[^a-z0-9._-]/g, "-").replace(/^-+/, "").slice(-80);
        if (!safe || !/\.(jpe?g|png|webp|gif)$/.test(safe)) return json(env, 400, { error: "Need a .jpg/.png/.webp/.gif file" });
        const clean = (dataBase64 || "").replace(/^data:[^;]+;base64,/, "");
        const dir = env.SITE_DIR ? env.SITE_DIR + "/" : "";
        const stamped = Date.now().toString(36) + "-" + safe;
        await ghPut(env, `${dir}assets/img/uploads/${stamped}`, clean, `Editor: upload ${stamped}`);
        return json(env, 200, { path: `assets/img/uploads/${stamped}` });
      }

      return json(env, 404, { error: "Not found" });
    } catch (e) {
      return json(env, 500, { error: String(e.message || e) });
    }
  },
};

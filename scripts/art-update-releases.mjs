// A.R.T site — First Thursdays auto-update
// Checks Spotify for new A.R.T releases and updates site/index.html:
//   - inserts a tracklist row for each new single (cover, title, year, direct track link)
//   - points the "latest drop" card at the newest single (name, cover, play link)
// Known releases are tracked in data/releases.json so each release is only added once.
//
// Requires (free) Spotify API credentials in env:
//   SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET  — create an app at developer.spotify.com
//
// Run: node scripts/update-releases.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ARTIST_ID = "6cJ05UAQ2Yab1UBcf5CrBU";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const INDEX = join(root, "ART", "index.html");
const DATA = join(root, "data", "art-releases.json");

const id = process.env.SPOTIFY_CLIENT_ID;
const secret = process.env.SPOTIFY_CLIENT_SECRET;
if (!id || !secret) {
  console.log("SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET not set — skipping update.");
  console.log("Create a free app at https://developer.spotify.com/dashboard and add both as repo secrets.");
  process.exit(0);
}

const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "&rsquo;");
const attr = (t) => t.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

async function api(url, opts) {
  const r = await fetch(url, opts);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText} for ${url}`);
  return r.json();
}

// 1) token (client credentials)
const tok = (
  await api("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"),
    },
    body: "grant_type=client_credentials",
  })
).access_token;
const auth = { headers: { Authorization: `Bearer ${tok}` } };

// 2) current discography
const albums = [];
let url = `https://api.spotify.com/v1/artists/${ARTIST_ID}/albums?include_groups=single,album&market=NZ&limit=50`;
while (url) {
  const page = await api(url, auth);
  albums.push(...page.items);
  url = page.next;
}
console.log(`Spotify lists ${albums.length} releases.`);

// 3) diff against known releases
const known = JSON.parse(readFileSync(DATA, "utf8"));
const knownIds = new Set(known.releases.map((r) => r.id));
const fresh = albums
  .filter((a) => !knownIds.has(a.id))
  .sort((a, b) => (a.release_date < b.release_date ? -1 : 1)); // oldest first so newest ends up on top

if (fresh.length === 0) {
  console.log("No new releases. Nothing to do.");
  process.exit(0);
}

let html = readFileSync(INDEX, "utf8");
let latest = null;

for (const a of fresh) {
  const full = await api(`https://api.spotify.com/v1/albums/${a.id}?market=NZ`, auth);
  const year = (full.release_date || "").slice(0, 4);
  const cover = (full.images.find((i) => i.width === 300) || full.images[0] || {}).url || "";
  const firstTrack = full.tracks.items[0];
  const isSingle = full.album_type === "single" && full.total_tracks === 1;
  const link = isSingle && firstTrack
    ? `https://open.spotify.com/track/${firstTrack.id}`
    : `https://open.spotify.com/album/${full.id}`;
  const feats = full.artists.filter((x) => x.name !== "A.R.T").map((x) => x.name);
  const sub = isSingle
    ? `Single · ${year}${feats.length ? " · with " + esc(feats.join(", ")) : " · First Thursdays"}`
    : `${full.album_type === "album" ? "Album" : "EP"} · ${year}`;

  // skip the row if this title is already in the tracklist (e.g. it was hand-curated)
  const already = html.includes(`>${esc(full.name)}</div>`);
  if (!already) {
    const row = `<div class="track">
              <div class="track__meta">
                <img class="track__art" src="${attr(cover)}" alt="">
                <div>
                  <div class="track__title">${esc(full.name)}</div>
                  <div class="track__sub">${sub}</div>
                </div>
              </div>
              <a class="play" href="${attr(link)}" aria-label="${attr(`Play ${full.name} on Spotify`)}"><svg width="14" height="14" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></a>
            </div>
            `;
    html = html.replace("<!-- AUTO:NEW-RELEASES -->", "<!-- AUTO:NEW-RELEASES -->\n            " + row.trimEnd());
    console.log(`Added row: ${full.name} (${year})`);
  } else {
    console.log(`Row for "${full.name}" already present — not duplicating.`);
  }

  known.releases.push({ id: full.id, name: full.name, date: full.release_date, type: full.album_type });
  if (isSingle) latest = { name: full.name, link, cover640: (full.images[0] || {}).url || cover };
}

// 4) point the "latest drop" card at the newest single
if (latest) {
  html = html
    .replace(/<!-- AUTO:LATEST-NAME -->[\s\S]*?<!-- \/AUTO:LATEST-NAME -->/,
      `<!-- AUTO:LATEST-NAME -->${esc(latest.name)}<!-- /AUTO:LATEST-NAME -->`)
    .replace(/<!-- AUTO:LATEST-COVER -->[\s\S]*?<!-- \/AUTO:LATEST-COVER -->/,
      `<!-- AUTO:LATEST-COVER --><img src="${attr(latest.cover640)}" alt="${attr(`A.R.T — ${latest.name} cover`)}" width="640" height="640"><!-- /AUTO:LATEST-COVER -->`)
    .replace(/<!-- AUTO:LATEST-LINK -->[\s\S]*?<!-- \/AUTO:LATEST-LINK -->/,
      `<!-- AUTO:LATEST-LINK --><a class="btn btn--grad" href="${attr(latest.link)}">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>Play ${esc(latest.name)}
              </a><!-- /AUTO:LATEST-LINK -->`);
  console.log(`Latest drop is now: ${latest.name}`);
}

writeFileSync(INDEX, html);
writeFileSync(DATA, JSON.stringify(known, null, 2) + "\n");
console.log(`Done — ${fresh.length} new release(s) recorded.`);

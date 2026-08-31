// A.R.T "Watch" section auto-update.
// Reads the channel's public RSS feed (no API key needed) and, when a NEW
// "(Official Music Video)" appears, promotes it to the feature slot — the old
// feature slides to the front of the row, and the row is trimmed back to 4.
// Lyric videos, vlogs, shorts and Fresh-TV clips are ignored.
//
// Run: node scripts/art-update-videos.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { renderFeature, renderRow } from "./lib/render-videos.mjs";

const CHANNEL_ID = "UCDyeo3YJV4FashJvxd60JGQ";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const INDEX = join(root, "art", "index.html");
const DATA = join(root, "data", "art-videos.json");

const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
const xml = await (await fetch(feedUrl)).text();

// Parse <entry> blocks (newest first in the feed)
const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => {
  const b = m[1];
  const id = (b.match(/<yt:videoId>(.*?)<\/yt:videoId>/) || [])[1];
  const raw = (b.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || "";
  const title = raw.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"');
  return { id, title };
});

const data = JSON.parse(readFileSync(DATA, "utf8"));
const known = new Set(data.known);

// Newest official music video we haven't recorded yet (feed is newest-first)
const isMV = (t) => /\(official music video\)/i.test(t);
const cleanTitle = (t) => t.replace(/\s*A\.R\.T\s*[-–]\s*/i, "").replace(/\s*\(official music video\)/i, "").trim();

const newMV = entries.find((e) => e.id && isMV(e.title) && !known.has(e.id));

if (!newMV) {
  console.log("No new official music video. Nothing to do.");
  process.exit(0);
}

console.log(`New music video: ${newMV.title} (${newMV.id})`);

// Promote: old feature -> front of row, new -> feature, keep 4 in the row
data.row.unshift(data.feature);
data.row = data.row.slice(0, 4);
data.feature = { id: newMV.id, title: cleanTitle(newMV.title) };
data.known.push(newMV.id);

// Rebuild the HTML between the markers
let html = readFileSync(INDEX, "utf8");
html = html.replace(
  /<!-- AUTO:WATCH-FEATURE -->[\s\S]*?<!-- \/AUTO:WATCH-FEATURE -->/,
  `<!-- AUTO:WATCH-FEATURE -->\n${renderFeature(data)}\n        <!-- /AUTO:WATCH-FEATURE -->`
);
html = html.replace(
  /<!-- AUTO:WATCH-ROW -->[\s\S]*?<!-- \/AUTO:WATCH-ROW -->/,
  `<!-- AUTO:WATCH-ROW -->\n          ${renderRow(data)}\n          <!-- /AUTO:WATCH-ROW -->`
);

writeFileSync(INDEX, html);
writeFileSync(DATA, JSON.stringify(data, null, 2) + "\n");
console.log(`Feature is now: ${data.feature.title}`);

// TEMP diagnostic: find which /artists/{id}/albums request shape Spotify accepts.
const ARTIST_ID = "6cJ05UAQ2Yab1UBcf5CrBU";
const id = process.env.SPOTIFY_CLIENT_ID, secret = process.env.SPOTIFY_CLIENT_SECRET;

const tokRes = await fetch("https://accounts.spotify.com/api/token", {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
    Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"),
  },
  body: "grant_type=client_credentials",
});
const tok = (await tokRes.json()).access_token;
console.log("token ok:", !!tok);
const auth = { headers: { Authorization: `Bearer ${tok}` } };

const base = `https://api.spotify.com/v1/artists/${ARTIST_ID}/albums`;
const variants = [
  `${base}?limit=20`,
  `${base}?limit=10`,
  `${base}?include_groups=single&limit=20`,
  `${base}?include_groups=single,album&limit=20`,
  `${base}?include_groups=single%2Calbum&limit=20`,
  `${base}?market=NZ&limit=20`,
  `${base}?include_groups=single,album&market=NZ&limit=20`,
  `${base}`,
];
for (const u of variants) {
  const r = await fetch(u, auth);
  let note = "";
  if (r.ok) { const d = await r.json(); note = `total=${d.total} items=${d.items.length}`; }
  else { note = (await r.text()).slice(0, 90); }
  console.log(`${r.status}  ${u.replace(base, "…/albums")}  ${note}`);
}

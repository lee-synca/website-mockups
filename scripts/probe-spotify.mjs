// TEMP: dump the full current discography (id, name, date) to baseline `known`.
const ARTIST_ID = "6cJ05UAQ2Yab1UBcf5CrBU";
const id = process.env.SPOTIFY_CLIENT_ID, secret = process.env.SPOTIFY_CLIENT_SECRET;

const tok = (await (await fetch("https://accounts.spotify.com/api/token", {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
    Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"),
  },
  body: "grant_type=client_credentials",
})).json()).access_token;
const auth = { headers: { Authorization: `Bearer ${tok}` } };

const items = [];
let url = `https://api.spotify.com/v1/artists/${ARTIST_ID}/albums?include_groups=single,album&market=NZ&limit=10`;
while (url) {
  const page = await (await fetch(url, auth)).json();
  items.push(...page.items);
  url = page.next;
}
// De-dupe by id, print as JSON for copy into art-releases.json
const seen = new Set();
const rows = items.filter((a) => !seen.has(a.id) && seen.add(a.id))
  .map((a) => ({ id: a.id, name: a.name, date: a.release_date, type: a.album_type }));
console.log("COUNT " + rows.length);
console.log("JSON_START");
console.log(JSON.stringify(rows));
console.log("JSON_END");

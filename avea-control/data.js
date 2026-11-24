/* AVEA Control Centre: demo data.
   Every artist, person and number here is fictional, made up for the demo. */
window.DEMO = {
  today: '2026-11-23',
  team: { name: 'AVEA team' },

  stages: [
    { id: 'new', name: 'New' },
    { id: 'listening', name: 'Listening' },
    { id: 'call', name: 'Call booked' },
    { id: 'offer', name: 'Offer sent' },
    { id: 'signed', name: 'Signed' }
  ],

  applications: [
    {
      id: 'a1', artist: 'Selu Grace', contact: 'Selu Tavita', email: 'selu@example.com', region: 'Aotearoa / New Zealand', genre: 'R&B',
      applied: '2026-11-22', stage: 'new', journey: '1–3 releases out', tracks: '1–5', distributor: 'Yes, currently signed', rights: 'Yes, I own everything',
      help: ['Distribution', 'Release strategy', 'Artist growth'], start: 'Within 1–3 months', heard: 'Another artist',
      link: 'https://open.spotify.com/artist/demo-selu',
      goals: 'I want my next EP to reach Pacific audiences in Australia and the States, not just Auckland. My current distributor just uploads and that\'s it.',
      spotify: { followers: 4820, latest: { title: 'Salt in the Water', date: '2026-09-12' }, releases: 3 },
      youtube: { subs: 2310, views30: 18400 }, instagram: { handle: '@selugrace', followers: 9600 },
      notes: []
    },
    {
      id: 'a2', artist: 'Kalo Kings', contact: 'Ioane Fuimaono', email: 'kalokings@example.com', region: 'Samoa', genre: 'Reggae',
      applied: '2026-11-21', stage: 'new', journey: 'Releasing regularly', tracks: '16–40', distributor: 'Between distributors', rights: 'Partially / it\'s shared',
      help: ['Distribution', 'YouTube monetisation', 'Rights & royalties'], start: 'As soon as possible', heard: 'Social media',
      link: 'https://youtube.com/@kalokings-demo',
      goals: 'Our videos get shared a lot on Facebook and YouTube by other pages but we never see anything from it. We want to sort out our catalogue properly.',
      spotify: { followers: 12900, latest: { title: 'Island Time (Live)', date: '2026-10-03' }, releases: 22 },
      youtube: { subs: 31800, views30: 412000 }, instagram: { handle: '@kalokings', followers: 21400 },
      notes: []
    },
    {
      id: 'a3', artist: 'Mele Vai', contact: 'Mele Vaipulu', email: 'melevai@example.com', region: 'Tonga', genre: 'Island Gospel',
      applied: '2026-11-19', stage: 'listening', journey: 'Preparing my first release', tracks: 'None yet', distributor: 'No, not yet', rights: 'Not sure',
      help: ['Distribution', 'Not sure yet'], start: 'Just exploring for now', heard: 'Event or show',
      link: 'https://soundcloud.com/demo-melevai',
      goals: 'I sing at church and family events and people keep asking where they can listen. I don\'t know where to start.',
      spotify: null, youtube: { subs: 640, views30: 5200 }, instagram: { handle: '@mele.vai', followers: 1800 },
      notes: ['Lovely voice. Needs a lot of support with rights basics. Good fit for a first-release package.']
    },
    {
      id: 'a4', artist: 'Pacific Static', contact: 'Daniel Ah Chong', email: 'pacstatic@example.com', region: 'Australia', genre: 'Hip-Hop',
      applied: '2026-11-17', stage: 'listening', journey: '1–3 releases out', tracks: '6–15', distributor: 'Yes, currently signed', rights: 'Yes, I own everything',
      help: ['Release strategy', 'Artist growth'], start: 'Within 1–3 months', heard: 'Search',
      link: 'https://open.spotify.com/artist/demo-pacstatic',
      goals: 'Got a mixtape ready. Want a proper rollout instead of dropping it and hoping.',
      spotify: { followers: 7350, latest: { title: 'Westside Fale', date: '2026-07-21' }, releases: 9 },
      youtube: { subs: 5100, views30: 39800 }, instagram: { handle: '@pacificstatic', followers: 14200 },
      notes: []
    },
    {
      id: 'a5', artist: 'Tavita & The Reef', contact: 'Tavita Leaupepe', email: 'reef@example.com', region: 'Pacific diaspora (elsewhere)', genre: 'Pop',
      applied: '2026-11-12', stage: 'call', journey: 'Releasing regularly', tracks: '16–40', distributor: 'Yes, currently signed', rights: 'Yes, I own everything',
      help: ['Distribution', 'YouTube monetisation', 'Release strategy'], start: 'As soon as possible', heard: 'Word of mouth',
      link: 'https://open.spotify.com/artist/demo-reef',
      goals: 'Based in Salt Lake City. Big Polynesian audience here and back home. Want one team handling distribution and YouTube.',
      spotify: { followers: 26400, latest: { title: 'Aloha Ave', date: '2026-10-24' }, releases: 18 },
      youtube: { subs: 48700, views30: 610000 }, instagram: { handle: '@tavitareef', followers: 52300 },
      call: 'Thu 27 Nov, 2:00 pm NZT',
      notes: ['Strong catalogue. Ask about their current distributor contract end date.']
    },
    {
      id: 'a6', artist: 'Sina Mo\'ui', contact: 'Sina Mo\'ui', email: 'sina@example.com', region: 'Fiji', genre: 'Soul',
      applied: '2026-11-04', stage: 'offer', journey: '1–3 releases out', tracks: '1–5', distributor: 'No, not yet', rights: 'Yes, I own everything',
      help: ['Distribution', 'Rights & royalties', 'Artist growth'], start: 'As soon as possible', heard: 'Another artist',
      link: 'https://youtube.com/@sina-demo',
      goals: 'I want to release properly and understand what I\'m owed.',
      spotify: { followers: 2190, latest: { title: 'Lali', date: '2026-06-30' }, releases: 2 },
      youtube: { subs: 3900, views30: 27100 }, instagram: { handle: '@sinamoui', followers: 6700 },
      notes: ['Offer sent 18 Nov. Plain-language summary sheet included.']
    },
    {
      id: 'a7', artist: 'Koru Lane', contact: 'Hemi Paora', email: 'korulane@example.com', region: 'Aotearoa / New Zealand', genre: 'Indie',
      applied: '2026-10-28', stage: 'signed', journey: 'Releasing regularly', tracks: '6–15', distributor: 'Between distributors', rights: 'Yes, I own everything',
      help: ['Distribution', 'Release strategy'], start: 'As soon as possible', heard: 'Search',
      link: 'https://open.spotify.com/artist/demo-koru',
      goals: 'Steady releases every 6–8 weeks.',
      spotify: { followers: 9800, latest: { title: 'Harbour Lights', date: '2026-08-15' }, releases: 11 },
      youtube: { subs: 2700, views30: 14800 }, instagram: { handle: '@korulane', followers: 11900 },
      notes: ['Signed 14 Nov. First release with AVEA: "Long White" on 12 Dec.']
    }
  ],

  releases: [
    {
      id: 'r1', artist: 'Koru Lane', title: 'Long White', type: 'Single', date: '2026-12-12',
      assets: { audio: true, artwork: false, credits: false, lyrics: true },
      credits: [ { name: 'Hemi Paora', role: 'Songwriter', split: 60 }, { name: 'Ana Ruatapu', role: 'Songwriter', split: 30 }, { name: 'Leo Kim', role: 'Producer', split: 5 } ]
    },
    {
      id: 'r2', artist: 'Selu Grace', title: 'Tide Line EP', type: 'EP · 5 tracks', date: '2027-01-30',
      assets: { audio: false, artwork: false, credits: false, lyrics: false },
      credits: [ { name: 'Selu Tavita', role: 'Songwriter', split: 100 } ]
    },
    {
      id: 'r3', artist: 'Sina Mo\'ui', title: 'Mana Moana', type: 'Single', date: '2026-11-28',
      assets: { audio: true, artwork: true, credits: true, lyrics: true },
      credits: [ { name: 'Sina Mo\'ui', role: 'Songwriter', split: 70 }, { name: 'J. Tuilagi', role: 'Songwriter', split: 30 } ]
    }
  ],

  /* Countdown, worked back from the release date (days relative to release day) */
  timeline: [
    { d: -35, t: 'Agreement and splits confirmed', who: 'AVEA + artist' },
    { d: -28, t: 'Final audio, artwork and credits locked', who: 'Artist' },
    { d: -24, t: 'Delivered to platforms', who: 'AVEA' },
    { d: -21, t: 'Content plan agreed: photos and short videos', who: 'AVEA + artist' },
    { d: -14, t: 'Pitched to Spotify editorial', who: 'AVEA', tip: 'Spotify needs at least 7 days. We aim for two weeks.' },
    { d: -14, t: 'Pre-save link live', who: 'AVEA' },
    { d: -7,  t: 'Teasers go out', who: 'Artist' },
    { d: 0,   t: 'Release day', who: 'Everyone' },
    { d: 7,   t: 'First-week check-in', who: 'AVEA + artist' },
    { d: 30,  t: 'Month-one review and next plan', who: 'AVEA + artist' }
  ],

  replies: [
    { id: 'received', name: 'Thanks, we\'ve got it',
      text: 'Kia ora {first},\n\nThanks for sending us {artist}. Your application is with us and we\'ll listen to your music properly before we get back to you. Timing depends on how many applications we have and what you need help with.\n\nIn the meantime, here\'s what happens next: https://weareavea.com/how-it-works\n\nNgā mihi,\nThe AVEA team' },
    { id: 'call', name: 'Let\'s talk',
      text: 'Kia ora {first},\n\nWe\'ve had a listen to {artist} and we\'d love to talk. Could you do a 30-minute video call this week or next? Reply with a couple of times that suit and we\'ll lock one in.\n\nWe\'ll talk through what you need, how we\'d work together, and any fees and splits, before anything is signed.\n\nNgā mihi,\nThe AVEA team' },
    { id: 'notyet', name: 'Not right now',
      text: 'Kia ora {first},\n\nThank you for sharing {artist} with us. We\'ve listened, and we don\'t think we\'re the right partner for where you are right now. That\'s about our fit, not your music.\n\nKeep going, and keep us posted. You\'re welcome to apply again when you have new music out.\n\nNgā mihi,\nThe AVEA team' }
  ]
};

/* Sample royalty export, in the shape most distribution services use:
   one row per track, platform, country and month. Generated so the numbers
   are the same every time. */
window.makeSampleCSV = function () {
  const tracks = [
    { t: 'Mana Moana', isrc: 'NZ-DEMO-26-00011' },
    { t: 'Lali', isrc: 'NZ-DEMO-26-00007' },
    { t: 'Rain on Tin', isrc: 'NZ-DEMO-25-00031' }
  ];
  const platforms = [ ['Spotify', .0042], ['Apple Music', .0071], ['YouTube', .0016], ['TikTok', .0009], ['Amazon Music', .0048], ['Deezer', .0039] ];
  const countries = [ ['NZ', 1], ['AU', .8], ['US', .62], ['WS', .22], ['FJ', .2], ['TO', .14], ['GB', .12] ];
  const months = ['2026-08', '2026-09', '2026-10'];
  let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const rows = ['month,platform,country,track,isrc,streams,net_revenue_nzd'];
  tracks.forEach((tr, ti) => months.forEach((m, mi) => platforms.forEach(([p, rate], pi) => countries.forEach(([c, w]) => {
    const base = [5200, 2600, 1400][ti] * (1 + mi * .18) * w * [1, .45, .9, .6, .2, .15][pi];
    const streams = Math.round(base * (.75 + rnd() * .5));
    if (streams < 20) return;
    rows.push([m, p, c, tr.t, tr.isrc, streams, (streams * rate).toFixed(2)].join(','));
  }))));
  return rows.join('\n');
};

window.SAMPLE_SPLITS = {
  'Mana Moana': [ ['Sina Mo\'ui', 70], ['J. Tuilagi', 30] ],
  'Lali': [ ['Sina Mo\'ui', 100] ],
  'Rain on Tin': [ ['Sina Mo\'ui', 50], ['Ana Ruatapu', 50] ]
};

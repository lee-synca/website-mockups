/* Renders the Events and News sections from data the team edits in the CMS
   (data/art-events.json, data/art-news.json). Editing those files — via the
   admin panel — updates these sections with no code changes. */
(function () {
  var esc = function (s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  };
  var attr = function (s) { return esc(s).replace(/"/g, "&quot;"); };
  // Non-technical editors forget the https:// — add it so links never break.
  var url = function (s) {
    s = String(s == null ? "" : s).trim();
    if (!s || s.charAt(0) === "#" || /^(https?:|mailto:|tel:)/i.test(s)) return s;
    return "https://" + s.replace(/^\/+/, "");
  };

  function eventCard(ev) {
    var ticket = ev.tickets_url && ev.tickets_url.trim()
      ? '<a class="btn btn--ink" href="' + attr(url(ev.tickets_url)) + '" target="_blank" rel="noopener">Tickets</a>'
      : '<span class="btn btn--ink event__soon" aria-disabled="true">Tickets on sale soon</span>';
    return '' +
      '<div class="card event">' +
        '<a class="event__poster" href="' + attr(ev.poster) + '" target="_blank" rel="noopener" aria-label="View the ' + attr(ev.name) + ' poster">' +
          '<img src="' + attr(ev.poster) + '" alt="' + attr(ev.poster_alt) + '">' +
        '</a>' +
        '<div class="event__body">' +
          '<div class="label label--coral">' + esc(ev.eyebrow || "Upcoming") + '</div>' +
          '<h3 class="event__name">' + esc(ev.name) + '</h3>' +
          '<div class="event__date">' + esc(ev.date_display) + '</div>' +
          '<div class="event__venue">' + esc(ev.venue) + '</div>' +
          (ev.lineup ? '<p class="event__lineup">' + esc(ev.lineup) + '</p>' : '') +
          '<div class="event__actions">' + ticket +
            '<a class="btn btn--soft" href="#connect">Get show alerts</a>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function newsCard(n) {
    return '' +
      '<article class="card news-card">' +
        '<img class="news-card__img" src="' + attr(n.image) + '" alt="' + attr(n.image_alt) + '">' +
        '<div class="news-card__body">' +
          '<div class="label label--coral">' + esc(n.label) + '</div>' +
          '<h3>' + esc(n.headline) + '</h3>' +
          (n.summary ? '<p>' + esc(n.summary) + '</p>' : '') +
          '<a class="news-card__link" href="' + attr(url(n.link)) + '" target="_blank" rel="noopener">Read on ' + esc(n.source) + ' &rarr;</a>' +
        '</div>' +
      '</article>';
  }

  function fill(id, url, key, render) {
    var el = document.getElementById(id);
    if (!el) return;
    fetch(url, { cache: "no-cache" })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var items = (data && data[key]) || [];
        el.innerHTML = items.map(render).join("");
      })
      .catch(function () { /* leave section as-is on failure */ });
  }

  fill("events-list", "../data/art-events.json", "events", eventCard);
  fill("news-grid", "../data/art-news.json", "news", newsCard);
})();

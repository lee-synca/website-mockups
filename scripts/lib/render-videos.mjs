// Shared renderer for the "Watch" section — used both to seed the initial HTML
// and by the daily auto-update job, so the markup can never drift between them.

const esc = (t) =>
  String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const playSvg = (size) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>`;

// A click-to-load "facade": thumbnail + play button. The real YouTube player
// (privacy-friendly nocookie domain) is only injected on click — see the
// inline script in index.html. No third-party JS loads until someone plays.
function facade(v, { feature = false } = {}) {
  const id = esc(v.id);
  const title = esc(v.title);
  return `<figure class="video${feature ? " video--feature" : ""}">
          <button class="video__btn" data-yt="${id}" aria-label="Play video: ${title}">
            <img class="video__thumb" src="https://i.ytimg.com/vi/${id}/maxresdefault.jpg" onerror="this.onerror=null;this.src='https://i.ytimg.com/vi/${id}/hqdefault.jpg'" alt="" loading="lazy" width="1280" height="720">
            <span class="video__play">${playSvg(feature ? 26 : 20)}</span>
          </button>
          <figcaption class="video__title">${title}</figcaption>
        </figure>`;
}

export function renderFeature(data) {
  return facade(data.feature, { feature: true });
}

export function renderRow(data) {
  return data.row.map((v) => facade(v)).join("\n        ");
}

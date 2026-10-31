/**
 * Builds the single HTML document shown in the Review screen's WebView:
 * book header + action bar + review body + related rows (see docs/design/Review.dc.html).
 * Dynamic state (action toggles, font size, related rows) is pushed in later via `window.__apply`.
 */
import type { Palette } from '@/constants/theme';
import type { Book } from '@/lib/catalog';

export type ListAction = 'bookmarks' | 'wishlist' | 'readLater';
export type ActionState = Record<ListAction, boolean | 'busy'>;

export type ReviewMeta = {
  book: Book;
  authors: string[];
  translators: string[];
  genres: string[];
  publisher?: string;
  coverSrc: string | null;
  date?: string;
};

export type RelatedBook = { id: number; title: string; author: string; coverSrc: string | null };

/** Messages posted from the page to React Native. */
export type ReviewMessage = { type: 'action'; action: ListAction } | { type: 'open'; id: number };

const COVER_COLORS = ['#7A2E2E', '#5A2F3F', '#3A3F5C', '#3C4F3A', '#2E4A6B', '#6B4A26'];

const STAR_PATH =
  'M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z';

const ICONS: Record<ListAction, string> = {
  bookmarks: '<path d="M6 3h12v18l-6-4-6 4z"/>',
  wishlist:
    '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
  readLater: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
};

const LABELS: Record<ListAction, { on: string; off: string }> = {
  bookmarks: { on: 'Отметнато', off: 'Отметни' },
  wishlist: { on: 'Желания', off: 'Желания' },
  readLater: { on: 'За по-късно', off: 'За по-късно' },
};

export function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Offline rendering strips media at render time (the file keeps the raw HTML). */
export function stripMedia(html: string) {
  return html
    .replace(/<(script|iframe|video|audio|svg|picture|figure)[\s\S]*?<\/\1>/gi, '')
    .replace(/<img[^>]*>/gi, '');
}

/** Lazy-load plugins keep the real URL in data-src; a duplicate src would win, so drop it first. */
export function unlazyImages(html: string) {
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    if (!/\sdata-src=/i.test(tag)) return tag;
    return tag
      .replace(/\s(src|srcset)=("[^"]*"|'[^']*')/gi, '')
      .replace(/\sdata-(src|srcset|sizes)=/gi, ' $1=');
  });
}

/** 4.5 → "4,5", 4 → "4" */
export function formatRating(rating: number) {
  return Number.isInteger(rating) ? String(rating) : rating.toFixed(1).replace('.', ',');
}

/** "2026-10-11T08:00:00" → "11.10.2026" */
function formatDate(iso?: string) {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : null;
}

function cover(id: number, title: string, src: string | null) {
  const bg = COVER_COLORS[id % COVER_COLORS.length];
  const img = src ? `<img src="${escapeHtml(src)}" alt="" onerror="this.remove()">` : '';
  return `<div class="cover" style="background:${bg}"><span>${escapeHtml(title)}</span>${img}</div>`;
}

function stars(rating: number, tag: 'dd' | 'div') {
  const items = [0, 1, 2, 3, 4].map((i) => {
    const w = Math.max(0, Math.min(1, rating - i)) * 100;
    return `<span class="star"><svg viewBox="0 0 24 24"><path d="${STAR_PATH}"/></svg><span style="width:${w}%"><svg viewBox="0 0 24 24"><path d="${STAR_PATH}"/></svg></span></span>`;
  });
  const label = formatRating(rating);
  return `<${tag} class="rating" role="img" aria-label="Рейтинг ${label} от 5">${items.join('')}<b>${label}/5</b></${tag}>`;
}

function actionButton(action: ListAction) {
  const { on, off } = LABELS[action];
  return `<button id="a-${action}" data-action="${action}" data-on="${on}" data-off="${off}" aria-pressed="false"><svg viewBox="0 0 24 24">${ICONS[action]}</svg><span>${off}</span></button>`;
}

/** Affiliate link to Ozone; the WebView's link handler opens it in the in-app browser. */
function buyButton(url?: string) {
  if (!url || !/^https?:\/\//i.test(url)) return '';
  return `<a class="buy" href="${escapeHtml(url)}"><svg viewBox="0 0 24 24"><path d="M5 8h14l-1.2 12H6.2z"/><path d="M9 8a3 3 0 0 1 6 0"/></svg><span>Купи от Ozone</span><svg class="ext" viewBox="0 0 24 24"><path d="M7 17L17 7M9 7h8v8"/></svg></a>`;
}

export function relatedHtml(sameAuthor: RelatedBook[], similar: RelatedBook[]) {
  const row = (title: string, books: RelatedBook[]) =>
    books.length === 0
      ? ''
      : `<section class="related"><h2>${title}</h2><div class="row">${books
          .map(
            (b) =>
              `<a href="#" data-book="${b.id}">${cover(b.id, b.title, b.coverSrc)}<div class="t">${escapeHtml(b.title)}</div><div class="a">${escapeHtml(b.author)}</div></a>`
          )
          .join('')}</div></section>`;
  return row('От същия автор', sameAuthor) + row('Подобни книги', similar);
}

export function buildReviewHtml(opts: {
  meta: ReviewMeta;
  content: string;
  online: boolean;
  colors: Palette;
  fontSize: number;
}) {
  const { meta, content, online, colors: c, fontSize } = opts;
  const { book } = meta;
  const body = online ? unlazyImages(content) : stripMedia(content);

  // [label HTML (static), value text]
  const rows: [string, string][] = [];
  if (meta.authors.length) rows.push(['Автор', meta.authors.join(', ')]);
  if (meta.translators.length) rows.push(['Превод', meta.translators.join(', ')]);
  if (meta.genres.length) rows.push(['Жанр', meta.genres.join(', ')]);
  if (meta.publisher)
    rows.push(['<span class="ph">Изд.</span><span class="tb">Издателство</span>', meta.publisher]);
  if (book.book_series)
    rows.push([
      'Поредица',
      book.series_number != null ? `${book.book_series} #${book.series_number}` : book.book_series,
    ]);
  if (book.pages) rows.push(['Страници', String(book.pages)]);

  const dl = rows
    .map(([dt, dd]) => `<dt>${dt}</dt><dd>${escapeHtml(dd)}</dd>`)
    .join('');

  // Offline: compact header, no action bar (docs/design/Offline.dc.html).
  const line = (cls: string, text: string) => (text ? `<div class="${cls}">${escapeHtml(text)}</div>` : '');
  const header = online
    ? `<div class="top">
    ${cover(book.id, book.title, meta.coverSrc)}
    <dl>${dl}${book.rating ? `<dt>Рейтинг</dt>${stars(book.rating, 'dd')}` : ''}</dl>
  </div>`
    : `<div class="top compact">
    ${cover(book.id, book.title, meta.coverSrc)}
    <div class="lines">
      ${line('who', meta.authors.join(', '))}
      ${line('sub', meta.translators.length ? `Превод: ${meta.translators.join(', ')}` : '')}
      ${line('sub', [meta.genres.join(', '), meta.publisher].filter(Boolean).join(' · '))}
      ${book.rating ? stars(book.rating, 'div') : ''}
      <div class="saved"><svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg>Запазено на устройството</div>
    </div>
  </div>`;
  const actions = online
    ? `<div class="actions">${actionButton('bookmarks')}${actionButton('wishlist')}${actionButton('readLater')}</div>${buyButton(book.ozone_url)}`
    : '';

  const metaLine = [formatDate(meta.date), book['reading-time'] ? `${book['reading-time']} мин четене` : null]
    .filter(Boolean)
    .join(' · ');

  const fonts = online
    ? '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,700;1,7..72,400&family=IBM+Plex+Sans:wght@400;500;600&display=swap">'
    : '';

  return `<!doctype html>
<html lang="bg">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${fonts}
<style>
:root {
  --fs: ${fontSize}px;
  --text: ${c.text}; --muted: ${c.textMuted}; --secondary: ${c.textSecondary}; --quote: ${c.quote};
  --bg: ${c.surface}; --border: ${c.border}; --divider: ${c.divider};
  --accent: ${c.accent}; --on-accent: ${c.onAccent};
  --star: ${c.star}; --star-empty: ${c.starEmpty}; --placeholder: ${c.placeholder};
  --serif: 'Literata', Georgia, 'Times New Roman', serif;
  --sans: 'IBM Plex Sans', -apple-system, system-ui, Roboto, sans-serif;
}
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; background: var(--bg); color: var(--text); font-family: var(--sans); }
main { max-width: 800px; margin: 0 auto; padding: 8px 20px 32px; }
a { color: var(--accent); }

.top { display: flex; gap: 16px; }
.cover { position: relative; flex-shrink: 0; width: 104px; height: 156px; border-radius: 4px; overflow: hidden;
  display: flex; align-items: flex-end; padding: 10px; color: #fff;
  font-family: var(--serif); font-size: 14px; font-weight: 700; line-height: 1.2; }
.cover img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.top .cover { box-shadow: 0 6px 16px rgba(28,31,30,0.18); }
dl { margin: 0; display: grid; grid-template-columns: auto 1fr; column-gap: 10px; row-gap: 6px;
  font-size: 13px; line-height: 1.35; align-content: start; }
dt { color: var(--muted); }
dd { margin: 0; }
.tb { display: none; }
.rating { display: flex; align-items: center; gap: 2px; }
.rating b { margin-left: 4px; font-weight: 600; }
.star { position: relative; display: block; width: 16px; height: 16px; }
.star svg { position: absolute; left: 0; top: 0; width: 16px; height: 16px; fill: var(--star-empty); }
.star > span { position: absolute; left: 0; top: 0; height: 100%; overflow: hidden; }
.star > span svg { fill: var(--star); }

h1 { font-family: var(--serif); font-size: 23px; line-height: 1.28; font-weight: 700; margin: 20px 0 6px; }
.meta { font-size: 13px; color: var(--muted); }

.actions { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin: 16px 0; }
.actions button { height: 56px; border-radius: 12px; border: 1px solid var(--border); background: transparent;
  color: var(--text); font: 500 12px var(--sans); display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 4px; padding: 0 4px; }
.actions button svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2;
  stroke-linecap: round; stroke-linejoin: round; }
.actions button.on { background: var(--accent); border-color: var(--accent); color: var(--on-accent); font-weight: 600; }
.actions button.on:not(#a-readLater) svg { fill: currentColor; }
.actions button.busy { opacity: 0.55; }
.buy { display: flex; align-items: center; justify-content: center; gap: 8px; height: 44px; margin: -8px 0 16px;
  border-radius: 12px; border: 1px solid var(--border); color: var(--text); text-decoration: none;
  font: 500 14px var(--sans); }
.buy svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2;
  stroke-linecap: round; stroke-linejoin: round; }
.buy .ext { width: 14px; height: 14px; color: var(--muted); }
.buy:active { opacity: 0.6; }

.compact { padding-top: 8px; align-items: flex-start; }
.compact .cover { width: 72px; height: 108px; padding: 8px; font-size: 11px; box-shadow: none; }
.lines { display: flex; flex-direction: column; gap: 4px; font-size: 13px; }
.lines .who { font-weight: 500; }
.lines .sub { color: var(--muted); }
.lines .rating b { margin-left: 6px; }
.lines .star, .lines .star svg { width: 14px; height: 14px; }
.saved { display: flex; align-items: center; gap: 4px; color: var(--accent); margin-top: 4px; }
.saved svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

.content { border-top: 1px solid var(--divider); font-family: var(--serif); font-size: var(--fs);
  line-height: 1.65; overflow-wrap: break-word; }
.content.offline { border-top: 0; margin-top: 12px; }
.content.offline blockquote { border-left-width: 2px; }
.content::after { content: ''; display: block; clear: both; }
.content p { margin: 12px 0; }
.content h2, .content h3, .content h4 { line-height: 1.3; margin: 24px 0 8px; }
.content blockquote { margin: 16px 0; padding: 0 0 0 16px; border-left: 3px solid var(--divider);
  color: var(--quote); font-style: italic; }
.content img, .content video, .content iframe { max-width: 100%; height: auto; border-radius: 4px; }
.content figure { margin: 16px 0; }
.content figcaption { font: 12px var(--sans); color: var(--muted); margin-top: 4px; }
.content .alignright { float: right; max-width: 40%; margin: 4px 0 8px 14px; }
.content .alignleft { float: left; max-width: 40%; margin: 4px 14px 8px 0; }
.content .aligncenter { display: block; margin-left: auto; margin-right: auto; }

.related { margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--divider); }
.related h2 { margin: 0 0 12px; font-family: var(--serif); font-size: 18px; font-weight: 700; }
.row { display: flex; gap: 14px; overflow-x: auto; margin: 0 -20px; padding: 0 20px 4px;
  scrollbar-width: none; -webkit-overflow-scrolling: touch; }
.row::-webkit-scrollbar { display: none; }
.row a { flex-shrink: 0; width: 104px; display: flex; flex-direction: column; gap: 6px;
  text-decoration: none; color: var(--text); }
.row .cover { font-size: 12px; padding: 8px; }
.row .t { font-size: 13px; font-weight: 500; line-height: 1.3; }
.row .a { font-size: 12px; color: var(--muted); }

@media (min-width: 768px) {
  main { padding: 12px 24px 40px; }
  .top { gap: 24px; }
  .top:not(.compact) .cover { width: 140px; height: 210px; padding: 12px; font-size: 16px; }
  dl { font-size: 15px; column-gap: 14px; row-gap: 8px; }
  .ph { display: none; } .tb { display: inline; }
  .rating { gap: 3px; } .rating b { margin-left: 6px; }
  .star, .star svg { width: 20px; height: 20px; }
  h1 { font-size: 30px; line-height: 1.25; margin: 24px 0 6px; }
  .meta { font-size: 14px; }
  .actions { gap: 12px; margin: 20px 0; }
  .actions button { height: 52px; flex-direction: row; gap: 8px; font-size: 15px; font-weight: 400; }
  .buy { height: 52px; margin: -8px 0 20px; font-size: 15px; }
  .content { font-size: calc(var(--fs) + 2px); line-height: 1.7; }
  .content p { margin: 14px 0; }
  .content .alignright { margin-left: 18px; }
  .related { margin-top: 28px; padding-top: 24px; }
  .related h2 { font-size: 22px; margin-bottom: 14px; }
  .row { gap: 18px; margin: 0; padding: 0 0 4px; }
  .row a { width: 128px; }
  .row .cover { width: 128px; height: 192px; padding: 10px; font-size: 13px; }
  .row .t { font-size: 14px; } .row .a { font-size: 13px; }
}
</style>
</head>
<body>
<main>
  ${header}
  <h1>${escapeHtml(book.heading)}</h1>
  ${metaLine ? `<div class="meta">${escapeHtml(metaLine)}</div>` : ''}
  ${actions}
  <article class="content${online ? '' : ' offline'}">${body}</article>
  <div id="related"></div>
</main>
<script>
(function () {
  function post(m) { window.ReactNativeWebView.postMessage(JSON.stringify(m)); }
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action],[data-book]');
    if (!el) return;
    e.preventDefault();
    if (el.dataset.action) post({ type: 'action', action: el.dataset.action });
    else post({ type: 'open', id: Number(el.dataset.book) });
  });
  window.__apply = function (s) {
    if (s.actions) Object.keys(s.actions).forEach(function (k) {
      var b = document.getElementById('a-' + k), v = s.actions[k];
      if (!b) return;
      b.classList.toggle('on', v === true);
      b.classList.toggle('busy', v === 'busy');
      b.disabled = v === 'busy';
      b.setAttribute('aria-pressed', String(v === true));
      b.querySelector('span').textContent = v === true ? b.dataset.on : b.dataset.off;
    });
    if (s.fontSize) document.documentElement.style.setProperty('--fs', s.fontSize + 'px');
    if (typeof s.related === 'string') document.getElementById('related').innerHTML = s.related;
  };
})();
</script>
</body>
</html>`;
}

# Knigolandia app — WordPress side

Instructions for building the server side of the Knigolandia mobile app (Expo / React Native) on knigolandia.info.
Build it as **one small plugin**: `wp-content/plugins/knigolandia-app/`. Keep it self-contained, with no
dependency on theme code.

The app is already written against the contracts below. **Field names, types and URLs are a contract.** Do not
rename them; if something can't be done as specified, say so instead of changing the shape.

---

## 0. Before writing code — discover the data model

The site stores book data in custom fields and taxonomies whose exact keys are unknown to the app team.
Find them first and write them down in the plugin's README:

| app field | what to find |
|---|---|
| author(s) | where authors live (post meta with IDs? a taxonomy? a CPT?) and how to get ID + display name |
| translator(s) | same as authors |
| publisher | custom term — taxonomy slug |
| genre(s) | custom term — taxonomy slug |
| book title | the book's title (distinct from the post title, which is the review headline) |
| rating | star rating 0–5, halves allowed — meta key |
| series, pages | if these exist anywhere (meta key), include them; otherwise omit the fields |
| cover | the featured image (confirm) |

Only posts in these two categories (and their child categories, if any — check) are part of the app:

| category slug | `category` value in JSON |
|---|---|
| `hudozhestvena-literatura` | `fiction` |
| `nehudozhestvena-literatura` | `nonfiction` |

Only `publish` status posts. Never include drafts, private, password-protected or scheduled posts.

---

## 1. Catalogue — `catalog.json`

A static JSON file with every book, regenerated whenever content changes. The app downloads it whole
(no deltas) and keeps it on the device.

### Location
`wp-content/uploads/app/catalog.json` (create the directory if missing). Write to a temp file and `rename()`
it into place so clients never read a half-written file.

### Shape (exact)
```json
{
  "v": 1739712000,
  "authors":     { "12": "Никълъс Иймс" },
  "translators": { "4": "Елена Павлова" },
  "publishers":  { "7": "Студио Арт Лайн" },
  "genres":      { "3": "Фентъзи" },
  "books": [
    {
      "id": 123,
      "title": "Кървавата роза",
      "heading": "Кървавата роза копнее да излезе от бащината сянка",
      "author_id": [12],
      "translator_id": [4],
      "publisher_id": 7,
      "genre_id": [3],
      "category": "fiction",
      "rating": 4.5,
      "reading-time": 6,
      "img": "2026/10/karvavata-roza",
      "mtime": 1739000000,
      "series": "The Band",
      "pages": 592
    }
  ]
}
```

| key | type | notes |
|---|---|---|
| `v` | int | unix timestamp of this generation; same value as `version` in §2 |
| `authors`, `translators`, `publishers`, `genres` | object `{ "<id>": "<name>" }` | lookup tables; keys are strings (JSON), values are display names. Only include entries referenced by at least one book |
| `id` | int | post ID |
| `title` | string | book title |
| `heading` | string | review headline = post title, **decoded** (no `&#8211;` etc. — run through `html_entity_decode(..., ENT_QUOTES, 'UTF-8')`) |
| `author_id`, `translator_id`, `genre_id` | int[] | always arrays, possibly empty |
| `publisher_id` | int \| null | |
| `category` | `"fiction"` \| `"nonfiction"` | |
| `rating` | number | 0–5, halves allowed; `0` if unrated |
| `reading-time` | int | minutes, `ceil(word_count / 200)`, minimum 1. Count words on the stripped content; Cyrillic needs a Unicode-aware count (`preg_match_all('/[\p{L}\p{N}]+/u', ...)`), not `str_word_count` |
| `img` | string | featured image path relative to `uploads/`, **without** the size suffix and extension, e.g. `2026/10/karvavata-roza`. Empty string if none |
| `mtime` | int | `post_modified_gmt` as unix timestamp |
| `series` | string | **optional** — omit the key when unknown |
| `pages` | int | **optional** — omit the key when unknown |

Sort `books` by publish date, newest first. Output with `wp_json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)`.
Expected size: ~3000 books, ~450 KB raw / ~100 KB gzipped — make sure the server gzips `.json` (or the §2 route does).

### Regeneration
Regenerate on `save_post` (only for posts in the two categories), `deleted_post`, `trashed_post`,
`transition_post_status` (publish ↔ anything), and `edited_term` / `delete_term` for the author / translator /
publisher / genre taxonomies (renames must reach the lookup tables).

**Debounce:** the hooks must not regenerate inline. Schedule a single WP-Cron event ~60 s ahead if one isn't
already scheduled (`wp_next_scheduled` / `wp_schedule_single_event`); the event does the generation. Bulk edits
then cause one rebuild.

Also add a WP-CLI command `wp knigolandia-app catalog` that regenerates immediately (for the first build and
for debugging), and an admin-only "Regenerate now" button on a small settings page.

Generation must be efficient for 3000 posts: one `WP_Query` with `fields => 'ids'`, `no_found_rows => true`,
`posts_per_page => -1`, then prime caches with `update_meta_cache('post', $ids)` and
`update_object_term_cache($ids, 'post')`. No per-post queries in a loop.

---

## 2. `GET /wp-json/app/v1/catalog-version`

```json
{ "version": 1739712000, "url": "https://knigolandia.info/wp-json/app/v1/catalog?v=1739712000" }
```
- `version` = the `v` of the current file (store it in an option, e.g. `knigolandia_app_catalog_version`).
- `url` = where the app downloads the file. If you secure the catalogue (§8) this is the `catalog` route below;
  if not, it can be the direct uploads URL. The app just follows `url`.
- `Cache-Control: no-cache` — the app calls this on every launch and must see changes immediately.

### `GET /wp-json/app/v1/catalog`
Streams `catalog.json` (`Content-Type: application/json; charset=utf-8`), gzip if the client accepts it,
`Cache-Control: public, max-age=31536000, immutable` (the `?v=` param busts it). Needed only if direct file
access is blocked (§8); build it anyway so the app can switch with no app-side change.

---

## 3. Review content

The app currently calls core routes:
- `GET /wp-json/wp/v2/posts/{id}?_fields=id,content,modified_gmt,date,link`
- `GET /wp-json/wp/v2/posts?slug={slug}&_fields=id` — resolves internal links between reviews

To be able to lock down `wp/v2` later (§8), add app-namespace equivalents. The app will be switched to these:

### `GET /wp-json/app/v1/reviews/{id}`
```json
{
  "id": 123,
  "html": "<p>…</p>",
  "modified": 1739000000,
  "date": "2026-10-11T08:00:00",
  "link": "https://knigolandia.info/karvavata-roza/"
}
```
- `html` = `apply_filters('the_content', $post->post_content)` — same as `content.rendered`. Keep normal
  markup (`p`, `em`, `strong`, `blockquote`, headings, `img`, `figure`). Do not strip anything; the app strips
  media itself when offline.
- Image URLs must be absolute. Lazy-load plugins may put the real URL in `data-src` — that's fine, the app
  handles `data-src` / `data-srcset`.
- `modified` = `post_modified_gmt` as unix timestamp; `date` = local publish date in ISO format (`get_the_date('c')`
  without timezone suffix is fine — the app reads only `YYYY-MM-DD`).
- 404 (`{ "code": "not_found" }`) for posts that aren't published or aren't in the two categories.
- `Cache-Control: public, max-age=300`.

### `GET /wp-json/app/v1/reviews?slug={slug}`
`{ "id": 123 }` or 404. Same publish/category rules.

---

## 4. `GET /wp-json/app/v1/related/{id}`

```json
{ "sameAuthor": [456], "similar": [789, 790, 791, 792] }
```
- Plain post IDs; the app resolves them against the catalogue and drops IDs it doesn't know.
- `sameAuthor`: other books sharing at least one author, newest first, max 10, excluding `{id}`.
- `similar`: books sharing genres, ranked by number of shared genres, then newest; same category as `{id}`;
  exclude `{id}` and anything already in `sameAuthor`; max 10.
- Only published posts in the two categories.
- Cache the result in a transient per post (e.g. 12 h) and flush transients when the catalogue regenerates.
  `Cache-Control: public, max-age=3600`.
- Unknown / unpublished `{id}` → 404.

---

## 5. Cover image sizes

Register two hard-cropped sizes, output as **WebP**:
```php
add_image_size('app-thumb', 200, 300, true);  // → {base}-200x300.webp
add_image_size('app-large', 400, 600, true);  // → {base}-400x600.webp
```
- The app builds the URL itself: `{uploads}/{img}-200x300.webp` and `{uploads}/{img}-400x600.webp`, so the files
  must be named exactly like that. Check what WP actually produces for a JPEG upload with WebP output
  (`image_editor_output_format` filter maps `image/jpeg` → `image/webp`, WP 6.1+; confirm the server's
  GD/Imagick supports WebP). If WP would name the file differently (e.g. keep `.jpg` in the name), fix it in the
  generation step, not by changing the app's pattern.
- Scope the WebP mapping to these two sizes only if possible, so the rest of the site is unaffected.
- **Backfill** existing covers: a WP-CLI command `wp knigolandia-app covers` that generates just these two sizes
  for every featured image of a catalogue post (don't regenerate all sizes site-wide).

---

## 6. Push notifications — "Нови ревюта"

### Storage
Custom table `{$wpdb->prefix}knigolandia_push_tokens`: `id`, `token` (varchar 255, unique), `platform`
(`ios`|`android`), `created_at`, `last_seen_at`. Create with `dbDelta` on activation.

### Routes
- `POST /wp-json/app/v1/push/subscribe` — body `{ "token": "ExponentPushToken[…]", "platform": "ios" }`.
  Upsert; update `last_seen_at`. Validate the token format (`/^Expo(nent)?PushToken\[.+\]$/`). `{ "ok": true }`.
- `POST /wp-json/app/v1/push/unsubscribe` — body `{ "token": "…" }`. Delete. `{ "ok": true }` even if absent.

### Sending
- Trigger on `transition_post_status` when `$new === 'publish' && $old !== 'publish'` for posts in the two
  categories — **not** `save_post`/`publish_post` alone, so edits to published posts don't re-notify.
- Send asynchronously (schedule a single cron event), never inside the editor's save request.
- Expo Push API: `POST https://exp.host/--/api/v2/push/send`, batches of **100** messages.
  Message: `{ "to": token, "title": "Ново ревю", "body": <headline>, "data": { "id": <post id> }, "sound": "default" }`.
  The app opens `data.id` in the Review screen.
- Remove tokens that come back with `DeviceNotRegistered` (check both send tickets and receipts —
  `POST https://exp.host/--/api/v2/push/getReceipts` a few minutes later).
- If an Expo access token is configured (Expo dashboard → "Enhanced Security for Push"), send it as
  `Authorization: Bearer …`. Read it from `wp-config.php` constant `KNIGOLANDIA_EXPO_ACCESS_TOKEN`.

---

## 7. General rules for all routes

- Register under namespace `app/v1` with `register_rest_route`. Every route has an explicit
  `permission_callback` (see §8 — never `__return_true` once protection is on).
- Validate and sanitize all params (`'args' => [ 'id' => [ 'validate_callback' => … ] ]`, `absint`).
- JSON only; errors as `WP_Error` with proper HTTP status.
- No PHP notices/warnings in output (they corrupt JSON).
- WP-Cron only runs on traffic; recommend a real system cron hitting `wp-cron.php` every minute and
  `DISABLE_WP_CRON` — note this for the site admin rather than changing server config yourself.

---

## 8. Protecting the endpoints

### What's achievable (read this first)
There is no way to make an endpoint reachable **only** by the app with certainty: anything shipped inside the
app (a key, a signing secret) can be extracted by someone who decompiles it. Also, review text is already public
on the website, so the goal is realistic: **stop casual scraping of the API and abuse of the write endpoints**
(push subscribe), not secrecy. Protection is layered:

### Layer 1 — app key header (build now)
- Every app request sends `X-Knigolandia-Key: <key>`.
- Keys live in `wp-config.php`, not in the DB: `define('KNIGOLANDIA_APP_KEYS', 'key-2026a,key-2025b');`
  — a **list**, so a key can be rotated while older app versions still work; remove an old key once those
  versions are retired.
- One shared `permission_callback` for all `app/v1` routes: compare with `hash_equals()` against each key.
  Missing/invalid → `401 { "code": "app_key_required" }`.
- Make sure no page cache / CDN in front of `/wp-json/` serves a cached 200 to requests without the header:
  exclude `/wp-json/app/` from page caching, or send `Vary: X-Knigolandia-Key`.

### Layer 2 — rate limiting (build now)
- Per-IP limits using transients or object cache: e.g. `catalog`: 30/hour, `reviews` + `related`: 300/hour,
  `push/subscribe|unsubscribe`: 20/hour. Over limit → `429` with `Retry-After`.
- If the site is behind Cloudflare, also add a Cloudflare rate-limit rule for `/wp-json/` — mention it to the
  admin; get the client IP from `CF-Connecting-IP` only when the request really comes from Cloudflare.

### Layer 3 — close the side doors (build now, behind a setting)
- **Static catalogue file:** a static file in `uploads/` bypasses PHP, so the key check can't apply. Block direct
  access to `wp-content/uploads/app/` (`.htaccess` `Require all denied` for Apache; give the nginx snippet to the
  admin if nginx) and serve it only via `GET /app/v1/catalog` (§2). `catalog-version` then returns that URL.
- **Core `wp/v2` routes:** once the app uses `app/v1/reviews` (§3), unauthenticated access to `wp/v2/posts` (and
  `wp/v2/users`, which exposes usernames) can be refused via the `rest_authentication_errors` filter.
  **Must not break:** logged-in users (the block editor uses the REST API with a nonce — let
  `is_user_logged_in()` through), oEmbed (`oembed/1.0`), and any plugin that relies on public REST
  (check: Jetpack, SEO, forms, caching plugins). Put this behind an on/off option, default **off**, so it can be
  enabled after the app update is live.
- Cover images stay public (they're on the website anyway).

### Layer 4 — device attestation (optional, later)
Real "is this our genuine app on a real device" checks exist: **Apple App Attest** (iOS) and **Google Play
Integrity** (Android). The app gets a signed token from the OS; the server verifies it with Apple/Google and
issues a short-lived session token that the other routes require. It's the only approach that resists an
extracted key, but it's significant work on both sides (and needs Google Cloud + Apple developer setup).
Don't build it now — just keep the permission check in one function so it can be swapped in later.

---

## 9. Acceptance checks

Run these (with the key header once §8 is on) and paste the results in your summary:
```bash
K='X-Knigolandia-Key: <key>'
curl -s -H "$K" https://knigolandia.info/wp-json/app/v1/catalog-version
curl -s -H "$K" --compressed "$(curl -s -H "$K" https://knigolandia.info/wp-json/app/v1/catalog-version | jq -r .url)" | jq '{v, books: (.books|length), first: .books[0]}'
curl -s -H "$K" https://knigolandia.info/wp-json/app/v1/reviews/<id> | jq '{id, modified, date, link, html: (.html|.[0:200])}'
curl -s -H "$K" 'https://knigolandia.info/wp-json/app/v1/reviews?slug=<slug>'
curl -s -H "$K" https://knigolandia.info/wp-json/app/v1/related/<id>
curl -s -o /dev/null -w '%{http_code}\n' https://knigolandia.info/wp-json/app/v1/catalog-version   # → 401 without key
curl -s -o /dev/null -w '%{http_code}\n' https://knigolandia.info/wp-content/uploads/app/catalog.json   # → 403 when Layer 3 is on
curl -sI https://knigolandia.info/wp-content/uploads/<img>-400x600.webp   # → 200, image/webp
```
Also verify: every `img` in the catalogue resolves for both sizes; `heading` has no HTML entities; editing a
term name shows up in the catalogue after the debounce; publishing a post sends exactly one push, editing it
sends none; the block editor still works with Layer 3 enabled.

## Deliverables
- The plugin, with a README listing: discovered meta keys/taxonomies, all routes, `wp-config.php` constants,
  WP-CLI commands, and the server snippets (nginx / Cloudflare / system cron) the admin must apply.
- A short note of anything in this document that couldn't be done as written, and why.

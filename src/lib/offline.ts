import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';

import { coverUrl, type Book } from '@/lib/catalog';
import { fetchReview } from '@/lib/review-api';

export type OfflineEntry = { id: number; savedAt: string; modified: number; pinned: boolean };

const INDEX_KEY = 'offline:index';
const AUTO_CACHE_SIZE = 10;

const reviewFile = (id: number) => new File(Paths.document, 'reviews', `${id}.html`);
const coverFile = (id: number) => new File(Paths.document, 'covers', `${id}.webp`);

export async function readOfflineIndex(): Promise<OfflineEntry[]> {
  try {
    return JSON.parse((await AsyncStorage.getItem(INDEX_KEY)) ?? '[]') as OfflineEntry[];
  } catch {
    return [];
  }
}

async function writeIndex(entries: OfflineEntry[]) {
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(entries));
}

export async function readOfflineReview(id: number): Promise<string | null> {
  const file = reviewFile(id);
  return file.exists ? file.text() : null;
}

/** Local cover file URI for native image views, or null when not downloaded. */
export function offlineCoverUri(id: number): string | null {
  const file = coverFile(id);
  return file.exists ? file.uri : null;
}

/** Offline cover as a data URI, so the WebView can show it without file access. */
export async function readOfflineCover(id: number): Promise<string | null> {
  const file = coverFile(id);
  return file.exists ? `data:image/webp;base64,${await file.base64()}` : null;
}

/** Bytes on disk (review HTML + cover) for the given downloads. */
export function offlineSize(ids: number[]) {
  let bytes = 0;
  for (const id of ids) {
    for (const file of [reviewFile(id), coverFile(id)]) if (file.exists) bytes += file.size;
  }
  return bytes;
}

/** Downloads review HTML + cover (again if the post changed since). Pinned entries survive the auto-cache cleanup. */
export async function saveOffline(book: Book, pinned: boolean) {
  const entries = await readOfflineIndex();
  const existing = entries.find((e) => e.id === book.id);

  let modified = existing?.modified ?? 0;
  // `mtime` in the catalogue is the post's modified_gmt, same clock as `modified`.
  if (!existing || !reviewFile(book.id).exists || book.mtime > existing.modified) {
    const post = await fetchReview(book.id);
    new Directory(Paths.document, 'reviews').create({ intermediates: true, idempotent: true });
    const file = reviewFile(book.id);
    file.create({ overwrite: true });
    file.write(post.html);
    modified = post.modified;
  }

  if (!coverFile(book.id).exists) {
    new Directory(Paths.document, 'covers').create({ intermediates: true, idempotent: true });
    try {
      await File.downloadFileAsync(coverUrl(book, 'large'), coverFile(book.id), { idempotent: true });
    } catch {
      // A missing cover shouldn't block saving the text.
    }
  }

  const entry: OfflineEntry = {
    id: book.id,
    savedAt: existing?.savedAt ?? new Date().toISOString(),
    modified,
    pinned: pinned || !!existing?.pinned,
  };
  await writeIndex([...entries.filter((e) => e.id !== book.id), entry]);
}

/** Removes a pinned download. */
export async function removeOffline(id: number) {
  for (const file of [reviewFile(id), coverFile(id)]) {
    if (file.exists) file.delete();
  }
  await writeIndex((await readOfflineIndex()).filter((e) => e.id !== id));
}

/**
 * Startup, online only: keep the latest 10 reviews on disk (unpinned) and drop
 * unpinned entries that fell out of the latest 10. Failures are skipped silently.
 */
export async function syncAutoCache(books: Book[]) {
  const latest = [...books].sort((a, b) => b.id - a.id).slice(0, AUTO_CACHE_SIZE);
  const keep = new Set(latest.map((b) => b.id));
  for (const entry of await readOfflineIndex()) {
    if (!entry.pinned && !keep.has(entry.id)) await removeOffline(entry.id);
  }
  for (const book of latest) {
    try {
      await saveOffline(book, false);
    } catch {
      // Network hiccup — try again on the next app open.
    }
  }
}

/** Settings → "Изчисти автоматичния кеш": deletes unpinned downloads only. */
export async function clearAutoCache() {
  for (const entry of await readOfflineIndex()) {
    if (!entry.pinned) await removeOffline(entry.id);
  }
}

/** Everything that also has no catalogue entry any more (deleted posts). */
export async function removeOrphans(exists: (id: number) => boolean) {
  for (const entry of await readOfflineIndex()) {
    if (!exists(entry.id)) await removeOffline(entry.id);
  }
}

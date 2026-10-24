import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';

import { coverUrl, type Book } from '@/lib/catalog';
import { fetchReview } from '@/lib/review-api';

export type OfflineEntry = { id: number; savedAt: string; modified: number; pinned: boolean };

const INDEX_KEY = 'offline:index';

const reviewFile = (id: number) => new File(Paths.document, 'reviews', `${id}.html`);
const coverFile = (id: number) => new File(Paths.document, 'covers', `${id}.webp`);

async function readIndex(): Promise<OfflineEntry[]> {
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

/** Offline cover as a data URI, so the WebView can show it without file access. */
export async function readOfflineCover(id: number): Promise<string | null> {
  const file = coverFile(id);
  return file.exists ? `data:image/webp;base64,${await file.base64()}` : null;
}

/** Downloads review HTML + cover. Pinned entries survive the auto-cache cleanup. */
export async function saveOffline(book: Book, pinned: boolean) {
  const entries = await readIndex();
  const existing = entries.find((e) => e.id === book.id);

  let modified = existing?.modified ?? 0;
  if (!existing || !reviewFile(book.id).exists) {
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
  await writeIndex((await readIndex()).filter((e) => e.id !== id));
}

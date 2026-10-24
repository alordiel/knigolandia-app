import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { File, Paths } from 'expo-file-system';
import { create } from 'zustand';

import { API_URL, UPLOADS_URL } from '@/lib/config';

/** One entry of `catalog.json` — see docs/SPEC.md. */
export type Book = {
  id: number;
  title: string;
  heading: string;
  author_id: number[];
  translator_id: number[];
  publisher_id: number | null;
  genre_id: number[];
  category: 'fiction' | 'nonfiction';
  rating: number;
  'reading-time': number;
  img: string;
  mtime: number;
  /** Not in the catalogue yet — shown when present. */
  series?: string;
  pages?: number;
};

export type Lookup = Record<string, string>;

export type Catalog = {
  v: number;
  authors: Lookup;
  translators: Lookup;
  publishers: Lookup;
  genres: Lookup;
  books: Book[];
};

const VERSION_KEY = 'catalog:version';
const catalogFile = () => new File(Paths.document, 'catalog.json');

type CatalogState = {
  catalog: Catalog | null;
  byId: Map<number, Book>;
  status: 'idle' | 'loading' | 'ready' | 'error';
  load: () => Promise<void>;
};

function index(catalog: Catalog) {
  return new Map(catalog.books.map((b) => [b.id, b]));
}

export const useCatalog = create<CatalogState>((set, get) => ({
  catalog: null,
  byId: new Map(),
  status: 'idle',
  load: async () => {
    if (get().status === 'loading') return;
    set({ status: 'loading' });

    // 1. Render from the file on disk immediately.
    const file = catalogFile();
    if (file.exists) {
      try {
        const catalog = JSON.parse(await file.text()) as Catalog;
        set({ catalog, byId: index(catalog), status: 'ready' });
      } catch {
        // Corrupt file — fall through to a fresh download.
      }
    }

    // 2. If online, check the version and swap in a newer catalogue.
    try {
      const net = await NetInfo.fetch();
      if (!net.isConnected) return;
      const res = await fetch(`${API_URL}/app/v1/catalog-version`);
      const { version, url } = (await res.json()) as { version: number; url: string };
      const current = Number(await AsyncStorage.getItem(VERSION_KEY));
      if (version === current && get().catalog) return;

      const text = await (await fetch(url)).text();
      const catalog = JSON.parse(text) as Catalog;
      file.create({ overwrite: true });
      file.write(text);
      await AsyncStorage.setItem(VERSION_KEY, String(version));
      set({ catalog, byId: index(catalog), status: 'ready' });
    } catch {
      // Network failure is fine if we already have a catalogue on disk.
    } finally {
      if (get().status === 'loading') set({ status: get().catalog ? 'ready' : 'error' });
    }
  },
}));

export function names(lookup: Lookup | undefined, ids: (number | null)[]) {
  if (!lookup) return [];
  return ids.flatMap((id) => (id != null && lookup[id] ? [lookup[id]] : []));
}

export function coverUrl(book: Pick<Book, 'img'>, size: 'thumb' | 'large') {
  return `${UPLOADS_URL}/${book.img}-${size === 'thumb' ? '200x300' : '400x600'}.webp`;
}

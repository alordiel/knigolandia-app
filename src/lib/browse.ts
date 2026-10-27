import type { Book, Catalog, Lookup } from '@/lib/catalog';

export type BrowseKind = 'authors' | 'translators' | 'publishers' | 'genres';

/** Drawer → Разглеждане: lookup table + how a book links to an entry. */
export const BROWSE: Record<BrowseKind, { title: string; filter: string; ids: (b: Book) => (number | null)[] }> = {
  authors: { title: 'Автори', filter: 'Търсене на автор', ids: (b) => b.author_id },
  translators: { title: 'Преводачи', filter: 'Търсене на преводач', ids: (b) => b.translator_id },
  publishers: { title: 'Издателства', filter: 'Търсене на издателство', ids: (b) => [b.publisher_id] },
  genres: { title: 'Жанрове', filter: 'Търсене на жанр', ids: (b) => b.genre_id },
};

export const isBrowseKind = (kind: string): kind is BrowseKind => kind in BROWSE;

export type BrowseEntry = { id: number; name: string; count: number };

/** Entries that have at least one book, alphabetical (Bulgarian collation). */
export function browseEntries(catalog: Catalog, kind: BrowseKind): BrowseEntry[] {
  const lookup: Lookup = catalog[kind];
  const counts = new Map<number, number>();
  for (const book of catalog.books) {
    for (const id of BROWSE[kind].ids(book)) if (id != null) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return [...counts]
    .flatMap(([id, count]) => (lookup[id] ? [{ id, name: lookup[id], count }] : []))
    .sort((a, b) => a.name.localeCompare(b.name, 'bg'));
}

/** Books linked to one entry, newest first. */
export function booksFor(catalog: Catalog, kind: BrowseKind, id: number): Book[] {
  return catalog.books.filter((b) => BROWSE[kind].ids(b).includes(id)).sort((a, b) => b.id - a.id);
}

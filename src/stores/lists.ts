import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Book } from '@/lib/catalog';
import { removeOffline, saveOffline } from '@/lib/offline';

type ListName = 'bookmarks' | 'wishlist' | 'readLater';

type ListsState = Record<ListName, number[]> & {
  toggle: (list: Exclude<ListName, 'readLater'>, id: number) => void;
  /** Read later = offline download; resolves once the files are written or removed. */
  toggleReadLater: (book: Book) => Promise<void>;
  /** Startup: drop IDs whose book is no longer in the catalogue (files are removed separately). */
  prune: (exists: (id: number) => boolean) => void;
};

const without = (ids: number[], id: number) => ids.filter((x) => x !== id);

export const useLists = create<ListsState>()(
  persist(
    (set, get) => ({
      bookmarks: [],
      wishlist: [],
      readLater: [],
      toggle: (list, id) =>
        set((s) => ({ [list]: s[list].includes(id) ? without(s[list], id) : [id, ...s[list]] })),
      toggleReadLater: async (book) => {
        if (get().readLater.includes(book.id)) {
          await removeOffline(book.id);
          set((s) => ({ readLater: without(s.readLater, book.id) }));
        } else {
          await saveOffline(book, true);
          set((s) => ({ readLater: [book.id, ...without(s.readLater, book.id)] }));
        }
      },
      prune: (exists) =>
        set((s) => ({
          bookmarks: s.bookmarks.filter(exists),
          wishlist: s.wishlist.filter(exists),
          readLater: s.readLater.filter(exists),
        })),
    }),
    {
      name: 'lists',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ bookmarks, wishlist, readLater }) => ({ bookmarks, wishlist, readLater }),
    }
  )
);

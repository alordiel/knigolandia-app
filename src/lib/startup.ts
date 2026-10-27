import NetInfo from '@react-native-community/netinfo';
import type { QueryClient } from '@tanstack/react-query';

import type { Catalog } from '@/lib/catalog';
import { removeOrphans, syncAutoCache } from '@/lib/offline';
import { useLists } from '@/stores/lists';

let queue = Promise.resolve();

/**
 * Startup steps 2–3 from docs/SPEC.md, run whenever a catalogue is loaded or swapped in.
 * Queued so a disk load and a later download never touch the offline index concurrently.
 */
export function runStartupTasks(catalog: Catalog, queryClient: QueryClient) {
  queue = queue
    .then(async () => {
      const ids = new Set(catalog.books.map((b) => b.id));
      const exists = (id: number) => ids.has(id);

      // Lists are persisted; prune only after they've been read back from storage.
      if (!useLists.persist.hasHydrated()) {
        await new Promise<void>((resolve) => {
          const unsubscribe = useLists.persist.onFinishHydration(() => {
            unsubscribe();
            resolve();
          });
        });
      }
      useLists.getState().prune(exists);
      await removeOrphans(exists);

      if ((await NetInfo.fetch()).isConnected) await syncAutoCache(catalog.books);
    })
    .catch(() => {})
    .finally(() => queryClient.invalidateQueries({ queryKey: ['offline-index'] }));
}

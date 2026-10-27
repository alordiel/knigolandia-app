import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { readOfflineIndex } from '@/lib/offline';
import { useLists } from '@/stores/lists';

/** IDs with review HTML on disk: pinned "read later" plus the auto-cache. */
export function useOfflineIds() {
  const readLater = useLists((s) => s.readLater);
  const { data } = useQuery({
    // Re-read the index whenever a read-later download is added or removed.
    queryKey: ['offline-index', readLater],
    queryFn: readOfflineIndex,
  });
  return useMemo(() => new Set([...readLater, ...(data ?? []).map((e) => e.id)]), [readLater, data]);
}

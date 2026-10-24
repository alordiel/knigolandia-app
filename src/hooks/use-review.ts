import { useQuery } from '@tanstack/react-query';

import { coverUrl, useCatalog, type Book } from '@/lib/catalog';
import { readOfflineCover, readOfflineReview } from '@/lib/offline';
import { fetchRelated, fetchReview, type ReviewPost } from '@/lib/review-api';

export class OfflineUnavailableError extends Error {}

/** Review HTML: network when online (falling back to disk), disk only when offline. */
export function useReview(id: number, online: boolean) {
  return useQuery({
    queryKey: ['review', id, online],
    queryFn: async (): Promise<ReviewPost> => {
      if (online) {
        try {
          return await fetchReview(id);
        } catch (e) {
          const html = await readOfflineReview(id);
          if (html == null) throw e;
          return { id, html, modified: 0 };
        }
      }
      const html = await readOfflineReview(id);
      if (html == null) throw new OfflineUnavailableError();
      return { id, html, modified: 0 };
    },
    retry: (count, error) => !(error instanceof OfflineUnavailableError) && count < 2,
  });
}

/** Cover src for the header: remote when online, data URI from disk when offline. */
export function useCoverSrc(book: Book | undefined, online: boolean) {
  return useQuery({
    queryKey: ['cover', book?.id, online],
    enabled: !!book,
    queryFn: async () => (online ? coverUrl(book!, 'large') : await readOfflineCover(book!.id)),
  });
}

/** Related rows — online only; resolved against the catalogue, unknown IDs dropped. */
export function useRelated(id: number, online: boolean) {
  const byId = useCatalog((s) => s.byId);
  const query = useQuery({
    queryKey: ['related', id],
    enabled: online,
    queryFn: () => fetchRelated(id),
    retry: false,
  });
  const resolve = (ids: number[] = []) =>
    ids.flatMap((x) => {
      const b = byId.get(x);
      return b && b.id !== id ? [b] : [];
    });
  return {
    sameAuthor: online ? resolve(query.data?.sameAuthor) : [],
    similar: online ? resolve(query.data?.similar) : [],
  };
}

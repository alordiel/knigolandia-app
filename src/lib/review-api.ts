import { ApiError, apiJson } from '@/lib/api';

export type ReviewPost = {
  id: number;
  html: string;
  /** Unix seconds. */
  modified: number;
  /** ISO date of publication, when known. */
  date?: string;
  link?: string;
};

/** Review body + metadata (`app/v1/reviews/{id}`, docs/WORDPRESS.md §3). */
export async function fetchReview(id: number): Promise<ReviewPost> {
  return apiJson<ReviewPost>(`reviews/${id}`);
}

/** Resolves an internal review link; null when the slug isn't a review in the app (404). */
export async function fetchPostIdBySlug(slug: string): Promise<number | null> {
  try {
    // The path segment may still be percent-encoded; encode it exactly once.
    const { id } = await apiJson<{ id: number }>(`reviews?slug=${encodeURIComponent(decodeURIComponent(slug))}`);
    return id;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export type Related = { sameAuthor: number[]; similar: number[] };

export async function fetchRelated(id: number): Promise<Related> {
  return apiJson<Related>(`related/${id}`);
}

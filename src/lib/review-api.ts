import { API_URL } from '@/lib/config';

export type ReviewPost = {
  id: number;
  html: string;
  /** Unix seconds. */
  modified: number;
  /** ISO date of publication, when known. */
  date?: string;
  link?: string;
};

type WpPost = {
  id: number;
  content: { rendered: string };
  modified_gmt: string;
  date: string;
  link: string;
};

export async function fetchReview(id: number): Promise<ReviewPost> {
  const res = await fetch(
    `${API_URL}/wp/v2/posts/${id}?_fields=id,content,modified_gmt,date,link`
  );
  if (!res.ok) throw new Error(`Review ${id}: HTTP ${res.status}`);
  const post = (await res.json()) as WpPost;
  return {
    id: post.id,
    html: post.content.rendered,
    modified: Math.floor(Date.parse(`${post.modified_gmt}Z`) / 1000),
    date: post.date,
    link: post.link,
  };
}

export async function fetchPostIdBySlug(slug: string): Promise<number | null> {
  const res = await fetch(`${API_URL}/wp/v2/posts?slug=${encodeURIComponent(slug)}&_fields=id`);
  if (!res.ok) return null;
  const posts = (await res.json()) as { id: number }[];
  return posts[0]?.id ?? null;
}

export type Related = { sameAuthor: number[]; similar: number[] };

/** Custom endpoint, not built yet on the WP side (see docs/SPEC.md). */
export async function fetchRelated(id: number): Promise<Related> {
  const res = await fetch(`${API_URL}/app/v1/related/${id}`);
  if (!res.ok) throw new Error(`Related ${id}: HTTP ${res.status}`);
  return (await res.json()) as Related;
}

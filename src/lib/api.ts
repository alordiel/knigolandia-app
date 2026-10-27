import { API_URL, APP_KEY, SITE_URL } from '@/lib/config';

if (__DEV__ && !APP_KEY) {
  console.warn('EXPO_PUBLIC_KNIGOLANDIA_KEY is not set — app/v1 requests will get 401. Add it to .env.local.');
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    url: string
  ) {
    super(`HTTP ${status}: ${url}`);
  }
}

/**
 * fetch() with the app key attached. Accepts an `app/v1` path ("reviews/1") or a full URL;
 * the key is only ever sent to our own site (e.g. the catalogue URL from catalog-version).
 */
export async function apiFetch(pathOrUrl: string, init: RequestInit = {}) {
  const url = /^https?:/.test(pathOrUrl) ? pathOrUrl : `${API_URL}/app/v1/${pathOrUrl}`;
  const headers = new Headers(init.headers);
  if (url.startsWith(SITE_URL)) headers.set('X-Knigolandia-Key', APP_KEY);
  const res = await fetch(url, { ...init, headers });
  if (!res.ok) throw new ApiError(res.status, url);
  return res;
}

export async function apiJson<T>(pathOrUrl: string, init?: RequestInit): Promise<T> {
  return (await (await apiFetch(pathOrUrl, init)).json()) as T;
}

export const SITE_URL = 'https://knigolandia.info';
export const API_URL = `${SITE_URL}/wp-json`;
export const UPLOADS_URL = `${SITE_URL}/wp-content/uploads`;

/**
 * Sent as `X-Knigolandia-Key` on every request to the site (docs/WORDPRESS.md §8).
 * Set in `.env.local` (not committed); inlined into the bundle at build time.
 */
export const APP_KEY = process.env.EXPO_PUBLIC_KNIGOLANDIA_KEY ?? '';

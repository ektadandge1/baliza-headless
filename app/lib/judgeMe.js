/**
 * Judge.me integration helpers (server-side safe).
 *
 * Reads reviews from the Judge.me REST API:
 *   Base: https://judge.me/api/v1
 *   Auth: private API token (server-only) + shop_domain
 *
 * Requires the Judge.me "Awesome" plan and the following env vars:
 *   JUDGEME_SHOP_DOMAIN  e.g. your-store.myshopify.com
 *   JUDGEME_API_TOKEN    private API token (server-only)
 *
 * Until those are configured the helpers degrade gracefully (empty data),
 * so the storefront keeps working with its static fallback content.
 */

const API_BASE = 'https://judge.me/api/v1';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

let cache = {at: 0, reviews: null};

/**
 * @param {Record<string, string|undefined>} env
 * @returns {boolean}
 */
export function judgeMeEnabled(env) {
  return Boolean(env?.JUDGEME_SHOP_DOMAIN && env?.JUDGEME_API_TOKEN);
}

/**
 * Convert a Shopify product id (gid://shopify/Product/123) to its numeric
 * external id used by Judge.me.
 * @param {string|undefined} productId
 * @returns {string}
 */
export function getExternalId(productId) {
  if (!productId) return '';
  const str = String(productId);
  const parts = str.split('/');
  return parts[parts.length - 1] || str;
}

/**
 * Fetch all published reviews (cached). Returns normalized reviews.
 * @param {Record<string, string|undefined>} env
 * @returns {Promise<Array<object>>}
 */
export async function getAllReviews(env) {
  if (!judgeMeEnabled(env)) return [];

  const now = Date.now();
  if (cache.reviews && now - cache.at < CACHE_TTL) {
    return cache.reviews;
  }

  const {JUDGEME_SHOP_DOMAIN, JUDGEME_API_TOKEN} = env;
  /** @type {Array<object>} */
  const all = [];

  try {
    for (let page = 1; page <= 5; page++) {
      const url = new URL(`${API_BASE}/reviews`);
      url.searchParams.set('api_token', JUDGEME_API_TOKEN);
      url.searchParams.set('shop_domain', JUDGEME_SHOP_DOMAIN);
      url.searchParams.set('per_page', '100');
      url.searchParams.set('page', String(page));
      url.searchParams.set('published', '1');

      const res = await fetch(url.toString());
      if (!res.ok) break;

      const json = await res.json();
      const batch = Array.isArray(json) ? json : json?.reviews ?? [];
      if (!batch.length) break;

      all.push(...batch.map(normalizeReview));
      if (batch.length < 100) break;
    }
  } catch (error) {
    console.error('[Judge.me] Failed to fetch reviews:', error);
    cache = {at: now, reviews: []};
    return [];
  }

  cache = {at: now, reviews: all};
  return all;
}

/**
 * Filter reviews for a single product by its external id.
 * @param {Array<object>} reviews
 * @param {string|number|undefined} externalProductId
 * @returns {Array<object>}
 */
export function getProductReviews(reviews, externalProductId) {
  const key = String(externalProductId ?? '');
  if (!key) return [];
  return reviews
    .filter((r) => r.productExternalId === key)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Build a map of external product id -> { average, count, distribution }.
 * @param {Array<object>} reviews
 * @returns {Record<string, {average: number, count: number, distribution: object}>}
 */
export function buildRatingsMap(reviews) {
  /** @type {Record<string, any>} */
  const map = {};

  for (const r of reviews) {
    const key = r.productExternalId;
    if (!key) continue;

    if (!map[key]) {
      map[key] = {
        sum: 0,
        count: 0,
        distribution: {1: 0, 2: 0, 3: 0, 4: 0, 5: 0},
      };
    }

    map[key].sum += r.rating;
    map[key].count += 1;
    const rounded = Math.round(r.rating);
    if (map[key].distribution[rounded] != null) {
      map[key].distribution[rounded] += 1;
    }
  }

  for (const key of Object.keys(map)) {
    const entry = map[key];
    entry.average = entry.count ? entry.sum / entry.count : 0;
  }

  return map;
}

function normalizeReview(raw) {
  const externalId =
    raw.product_external_id ?? raw.external_id ?? raw.product_id ?? '';

  return {
    id: raw.id,
    rating: Number(raw.rating) || 0,
    title: raw.title || '',
    body: raw.body || raw.review_body || '',
    author: raw.review_author || raw.author || 'Anonymous',
    createdAt: raw.created_at || '',
    verified: Boolean(raw.verified),
    productExternalId: String(externalId),
    productTitle: raw.product_title || '',
    pictures: Array.isArray(raw.pictures)
      ? raw.pictures.filter((p) => !p.hidden).map((p) => p.url).filter(Boolean)
      : [],
  };
}

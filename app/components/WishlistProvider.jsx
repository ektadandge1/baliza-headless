import {createContext, useCallback, useContext, useEffect, useRef, useState} from 'react';

/**
 * App-free wishlist stored in the browser's localStorage.
 * Works for guests (no login, no Shopify dependency). The list is
 * hydrated on mount so server and first client render stay in sync
 * (no hydration mismatch).
 */

const STORAGE_KEY = 'baliza:wishlist';

/**
 * @typedef {{
 *   id: string;
 *   handle: string;
 *   title: string;
 *   image: string | null;
 *   price: number | null;
 *   currencyCode: string | null;
 *   variantId: string | null;
 * }} WishlistItem
 */

/** @typedef {{
 *   items: WishlistItem[];
 *   count: number;
 *   hydrated: boolean;
 *   has: (id: string) => boolean;
 *   add: (item: WishlistItem) => void;
 *   remove: (id: string) => void;
 *   toggle: (item: WishlistItem) => void;
 *   clear: () => void;
 * }} WishlistContextValue */

const WishlistContext = createContext(/** @type {WishlistContextValue | null} */ (null));

function readStorage() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function WishlistProvider({children}) {
  const [items, setItems] = useState(/** @type {WishlistItem[]} */ ([]));
  const [hydrated, setHydrated] = useState(false);
  const hydratedRef = useRef(false);

  // Load once on mount (client only).
  useEffect(() => {
    setItems(readStorage());
    hydratedRef.current = true;
    setHydrated(true);
  }, []);

  // Persist on change, but only after the initial hydration read.
  useEffect(() => {
    if (!hydratedRef.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore quota / privacy-mode errors
    }
  }, [items]);

  const has = useCallback(
    (id) => items.some((item) => item.id === id),
    [items],
  );

  const add = useCallback((item) => {
    setItems((current) => {
      if (current.some((entry) => entry.id === item.id)) return current;
      return [item, ...current];
    });
  }, []);

  const remove = useCallback((id) => {
    setItems((current) => current.filter((entry) => entry.id !== id));
  }, []);

  const toggle = useCallback((item) => {
    setItems((current) =>
      current.some((entry) => entry.id === item.id)
        ? current.filter((entry) => entry.id !== item.id)
        : [item, ...current],
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = {
    items,
    count: items.length,
    hydrated,
    has,
    add,
    remove,
    toggle,
    clear,
  };

  return (
    <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return ctx;
}

/**
 * Build a WishlistItem from a Storefront product-ish object.
 * @param {{
 *   id?: string;
 *   handle?: string;
 *   title?: string;
 *   featuredImage?: {url?: string; altText?: string | null} | null;
 *   priceRange?: {minVariantPrice?: {amount?: string; currencyCode?: string}};
 *   variants?: {nodes?: Array<{id?: string; availableForSale?: boolean}>};
 * }} product
 * @param {string} [variantId]
 * @returns {WishlistItem | null}
 */
export function toWishlistItem(product, variantId) {
  if (!product?.id || !product?.handle || !product?.title) return null;

  const price = product.priceRange?.minVariantPrice;
  const firstAvailable =
    product.variants?.nodes?.find((v) => v.availableForSale) ??
    product.variants?.nodes?.[0];

  return {
    id: product.id,
    handle: product.handle,
    title: product.title,
    image: product.featuredImage?.url ?? null,
    price: price?.amount != null ? Number(price.amount) : null,
    currencyCode: price?.currencyCode ?? null,
    variantId: variantId ?? firstAvailable?.id ?? null,
  };
}

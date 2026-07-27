import {useEffect} from 'react';

/**
 * Self-contained Judge.me platform-independent widget integration.
 *
 * Requires the Judge.me "Awesome" plan (or its free trial) with
 * "Platform-independent widgets" enabled in Judge.me admin, plus the
 * legacy Review Widget. Reads the store's public token + domain from env.
 *
 * When env vars are NOT set (e.g. free plan not yet enabled), nothing
 * renders and the storefront keeps its custom fallback sections.
 *
 * Uses the platform-independent `widgets.js` script (not `installed.js`)
 * to avoid the infinite-refresh loop some bundles cause on Oxygen.
 */

/**
 * Injects the Judge.me widget script once, globally.
 * @param {{shopDomain?: string, publicToken?: string}} props
 */
export function JudgeMeScript({shopDomain, publicToken}) {
  useEffect(() => {
    if (!shopDomain || !publicToken) return;
    if (document.querySelector('script[data-judge-me-widget]')) return;

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = `https://cdn.judge.me/widgets.js?shop_domain=${encodeURIComponent(
      shopDomain,
    )}&api_token=${encodeURIComponent(publicToken)}`;
    script.setAttribute('data-judge-me-widget', 'true');
    script.onload = () => {
      if (window.jdgm_preloader) window.jdgm_preloader();
    };
    document.head.appendChild(script);
  }, [shopDomain, publicToken]);

  return null;
}

function preload() {
  if (typeof window !== 'undefined' && window.jdgm_preloader) {
    window.jdgm_preloader();
  }
}

function toExternalId(id) {
  if (!id) return '';
  const str = String(id);
  const parts = str.split('/');
  return parts[parts.length - 1] || str;
}

/**
 * Full legacy review widget for a product page.
 * @param {{id?: string, title?: string}} props
 */
export function JudgeMeReviewWidget({id, title}) {
  const externalId = toExternalId(id);

  useEffect(() => {
    preload();
  }, [externalId]);

  if (!externalId) return null;

  return (
    <div
      className="jdgm-widget jdgm-review-widget jdgm-outside-widget"
      data-id={externalId}
      data-product-title={title}
    />
  );
}

/**
 * Compact star-rating badge for product cards.
 * @param {{id?: string}} props
 */
export function JudgeMePreviewBadge({id}) {
  const externalId = toExternalId(id);

  useEffect(() => {
    preload();
  }, [externalId]);

  if (!externalId) return null;

  return (
    <div className="jdgm-widget jdgm-review-badge" data-id={externalId} />
  );
}

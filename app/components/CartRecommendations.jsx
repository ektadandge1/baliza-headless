import {useEffect, useState} from 'react';
import {Link} from 'react-router';
import {Money} from '@shopify/hydrogen';
import {AddToCartButton} from '~/components/AddToCartButton';

/**
 * "Frequently bought together" cross-sell section for the cart.
 * Fetches recommendations from /api/recommendations based on current cart items.
 *
 * @param {{
 *   lines: Array<{merchandise: {product?: {id?: string}}}>
 * }} props
 */
export function CartRecommendations({lines}) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Extract product IDs from cart lines
  const productIds = lines
    .map((line) => line.merchandise?.product?.id)
    .filter(Boolean);
  const productIdsKey = productIds.join(',');

  useEffect(() => {
    if (!productIds.length) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchRecommendations() {
      try {
        const res = await fetch('/api/recommendations', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({productIds}),
        });
        const data = await res.json();
        if (!cancelled && data.ok && data.recommendations?.length) {
          setRecommendations(data.recommendations);
        }
      } catch {
        // Silent fail — recommendations are non-critical
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchRecommendations();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productIdsKey]);

  if (loading || !recommendations.length) return null;

  return (
    <div className="cart-recommendations">
      <h3 className="cart-recommendations__title">You might also like</h3>
      <div className="cart-recommendations__list">
        {recommendations.map((product) => (
          <RecommendationItem key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}

function RecommendationItem({product}) {
  const variant = product.variants?.nodes?.[0];
  const price = product.priceRange?.minVariantPrice;
  const canAdd = variant?.id && variant?.availableForSale;

  return (
    <div className="rec-item">
      <Link
        to={`/products/${product.handle}`}
        className="rec-item__media"
      >
        {product.featuredImage ? (
          <img
            src={product.featuredImage.url}
            alt={product.featuredImage.altText || product.title}
            loading="lazy"
          />
        ) : (
          <span className="rec-item__noimg" aria-hidden="true">
            {product.title.charAt(0)}
          </span>
        )}
      </Link>

      <div className="rec-item__body">
        <Link
          to={`/products/${product.handle}`}
          className="rec-item__title"
        >
          {product.title}
        </Link>

        {price && (
          <span className="rec-item__price">
            <Money
              data={{
                amount: String(price.amount),
                currencyCode: price.currencyCode,
              }}
            />
          </span>
        )}

        {canAdd ? (
          <AddToCartButton
            className="btn-add btn-add--xs"
            lines={[{merchandiseId: variant.id, quantity: 1}]}
          >
            Add to Cart
          </AddToCartButton>
        ) : (
          <span className="rec-item__unavailable">Sold out</span>
        )}
      </div>
    </div>
  );
}

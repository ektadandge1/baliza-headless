import {Image, Money} from '@shopify/hydrogen';
import {Link} from 'react-router';
import {AddToCartButton} from '~/components/AddToCartButton';
import {useWishlist} from '~/components/WishlistProvider';

/**
 * One wishlist entry: thumbnail, title, price, remove, add-to-cart.
 * Layout is driven by the parent container's CSS class.
 *
 * @param {{item: import('~/components/WishlistProvider').WishlistItem}} props
 */
export function WishlistItemCard({item}) {
  const {remove} = useWishlist();
  const canAdd = Boolean(item.variantId);

  return (
    <div className="wishlist-card">
      <Link to={`/products/${item.handle}`} className="wishlist-card__media">
        {item.image ? (
          <img src={item.image} alt={item.title} loading="lazy" />
        ) : (
          <span className="wishlist-card__noimg" aria-hidden="true">
            ♥
          </span>
        )}
      </Link>

      <div className="wishlist-card__body">
        <Link to={`/products/${item.handle}`} className="wishlist-card__title">
          {item.title}
        </Link>

        {item.price != null && item.currencyCode ? (
          <span className="wishlist-card__price">
            <Money
              data={{
                amount: String(item.price),
                currencyCode: item.currencyCode,
              }}
            />
          </span>
        ) : null}

        <div className="wishlist-card__actions">
          {canAdd ? (
            <AddToCartButton
              className="btn-add btn-add--sm"
              lines={[{merchandiseId: item.variantId, quantity: 1}]}
            >
              Add to Cart
            </AddToCartButton>
          ) : (
            <span className="wishlist-card__unavailable">Unavailable</span>
          )}
          <button
            type="button"
            className="wishlist-card__remove"
            onClick={() => remove(item.id)}
            aria-label={`Remove ${item.title} from wishlist`}
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

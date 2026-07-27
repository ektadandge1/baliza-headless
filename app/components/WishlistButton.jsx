import {toWishlistItem, useWishlist} from '~/components/WishlistProvider';

/**
 * Heart toggle that adds/removes a product from the wishlist.
 * Renders nothing if the product is missing required fields.
 *
 * @param {{
 *   product: {
 *     id?: string;
 *     handle?: string;
 *     title?: string;
 *     featuredImage?: {url?: string; altText?: string | null} | null;
 *     priceRange?: {minVariantPrice?: {amount?: string; currencyCode?: string}};
 *     variants?: {nodes?: Array<{id?: string; availableForSale?: boolean}>};
 *   };
 *   variantId?: string;
 *   className?: string;
 * }} props
 */
export function WishlistButton({product, variantId, className}) {
  const {has, toggle} = useWishlist();
  const item = toWishlistItem(product, variantId);

  if (!item) return null;

  const active = has(item.id);

  const handleClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggle(item);
  };

  return (
    <button
      type="button"
      className={`wishlist-btn${active ? ' is-active' : ''}${
        className ? ` ${className}` : ''
      }`}
      aria-pressed={active}
      aria-label={active ? `Remove ${item.title} from wishlist` : `Add ${item.title} to wishlist`}
      onClick={handleClick}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
          fill={active ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

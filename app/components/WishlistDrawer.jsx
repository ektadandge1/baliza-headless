import {Link} from 'react-router';
import {useAside} from '~/components/Aside';
import {useWishlist} from '~/components/WishlistProvider';
import {WishlistItemCard} from '~/components/WishlistItemCard';

/**
 * Content rendered inside the wishlist Aside drawer.
 */
export function WishlistDrawer() {
  const {items, count, clear} = useWishlist();
  const {close} = useAside();

  if (count === 0) {
    return (
      <div className="wishlist-empty">
        <span className="wishlist-empty__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="34" height="34">
            <path
              d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <h3>Your wishlist is empty</h3>
        <p>Tap the heart on any product to save it here for later.</p>
        <Link to="/collections/all" className="btn-add" onClick={close}>
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="wishlist-drawer">
      <div className="wishlist-drawer__head">
        <span>
          {count} {count === 1 ? 'item' : 'items'}
        </span>
        <button type="button" className="wishlist-clear" onClick={clear}>
          Clear all
        </button>
      </div>

      <div className="wishlist-list">
        {items.map((item) => (
          <WishlistItemCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

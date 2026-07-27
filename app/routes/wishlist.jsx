import {Link} from 'react-router';
import {useWishlist} from '~/components/WishlistProvider';
import {WishlistItemCard} from '~/components/WishlistItemCard';

/**
 * Standalone wishlist page (also reachable via the header heart icon's drawer).
 * @param {import('react-router').MetaArgs} _
 */
export const meta = () => [{title: 'Wishlist'}];

function HeartIcon({className}) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function WishlistPage() {
  const {items, count, clear} = useWishlist();

  return (
    <section className="wishlist-page">
      <nav className="wishlist-page__crumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span aria-hidden="true">/</span>
        <span>Wishlist</span>
      </nav>

      <header className="wishlist-hero">
        <span className="wishlist-hero__icon" aria-hidden="true">
          <HeartIcon className="wishlist-hero__heart" />
        </span>
        <div>
          <h1>Wishlist</h1>
          <p className="wishlist-page__sub">
            {count > 0
              ? `You have ${count} ${count === 1 ? 'item' : 'items'} saved for later.`
              : 'Tap the heart on any product to save it here.'}
          </p>
        </div>
        {count > 0 ? (
          <button type="button" className="wishlist-clear" onClick={clear}>
            Clear all
          </button>
        ) : null}
      </header>

      {count === 0 ? (
        <div className="wishlist-empty">
          <span className="wishlist-empty__icon" aria-hidden="true">
            <HeartIcon className="wishlist-empty__heart" />
          </span>
          <h3>Your wishlist is empty</h3>
          <p>Save the pieces you love and find them all in one place.</p>
          <Link to="/collections/all" className="btn-add">
            Start shopping
          </Link>
        </div>
      ) : (
        <div className="wishlist-grid">
          {items.map((item) => (
            <WishlistItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}

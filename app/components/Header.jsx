import {Suspense, useEffect, useState} from 'react';
import {Await, NavLink, useLocation} from 'react-router';
import {useAnalytics, useOptimisticCart} from '@shopify/hydrogen';
import {useAside} from '~/components/Aside';
import {useWishlist} from '~/components/WishlistProvider';
import {BRAND_LOGO_URL} from '~/lib/brand';

const SEARCH_PLACEHOLDERS = [
  'Search T-shirts',
  'Search Graphics',
  'Search Polos',
  'Search Essentials',
  'Search Offers',
];

/**
 * @param {HeaderProps}
 */
export function Header({header, cart, isLoggedIn, publicStoreDomain}) {
  const {shop} = header;

  return (
    <>
      <AnnouncementBar />
      <div className="header-wrapper">
        <header className="header" aria-label="Store header">
          <div className="header-section header-section--left">
            <MobileMenuToggle />
            <HeaderMenu
              viewport="desktop"
              primaryDomainUrl={header.shop.primaryDomain.url}
              publicStoreDomain={publicStoreDomain}
            />
          </div>

          <div className="header-logo">
            <NavLink prefetch="intent" to="/" end aria-label={`${shop.name} home`}>
              <img
                className="logo-image"
                src={BRAND_LOGO_URL}
                alt={shop.name}
              />
            </NavLink>
          </div>

          <HeaderActions
            cart={cart}
            isLoggedIn={isLoggedIn}
          />
        </header>

        <nav className="header-category-rail" aria-label="Featured categories">
          {FEATURED_LINKS.map((item) => (
            <NavLink key={item.id} to={item.url} prefetch="intent">
              {item.title}
            </NavLink>
          ))}
        </nav>
      </div>
    </>
  );
}

function AnnouncementBar() {
  return (
    <div className="announcement-bar" aria-label="Store announcement">
      <div className="announcement-track">
        <div className="announcement-content">
          <span>Free shipping over $150</span>
          <span className="announcement-sep" aria-hidden="true">&#9670;</span>
          <span>Premium cotton essentials</span>
          <span className="announcement-sep" aria-hidden="true">&#9670;</span>
          <a href="/collections/all">Shop the collection</a>
          <span className="announcement-sep" aria-hidden="true">&#9670;</span>
          <span>New arrivals weekly</span>
          <span className="announcement-sep" aria-hidden="true">&#9670;</span>
        </div>
        <div className="announcement-content" aria-hidden="true">
          <span>Free shipping over $150</span>
          <span className="announcement-sep">&#9670;</span>
          <span>Premium cotton essentials</span>
          <span className="announcement-sep">&#9670;</span>
          <a href="/collections/all">Shop the collection</a>
          <span className="announcement-sep">&#9670;</span>
          <span>New arrivals weekly</span>
          <span className="announcement-sep">&#9670;</span>
        </div>
      </div>
    </div>
  );
}

/**
 * @param {{
 *   primaryDomainUrl: HeaderProps['header']['shop']['primaryDomain']['url'];
 *   viewport: Viewport;
 *   publicStoreDomain: HeaderProps['publicStoreDomain'];
 *   isLoggedIn?: boolean;
 * }}
 */
export function HeaderMenu({primaryDomainUrl, viewport, publicStoreDomain, isLoggedIn, localization}) {
  if (viewport === 'mobile') {
    return (
      <MobileNav
        primaryDomainUrl={primaryDomainUrl}
        publicStoreDomain={publicStoreDomain}
        isLoggedIn={isLoggedIn}
        localization={localization}
      />
    );
  }

  return (
    <nav className="header-nav-desktop" role="navigation" aria-label="Main navigation">
      {STORE_HEADER_MENU.items.map((item) => (
        <DesktopNavItem key={item.id} item={item} />
      ))}
    </nav>
  );
}

function DesktopNavItem({item}) {
  const hasChildren = item.items.length > 0;

  return (
    <div className={`nav-item ${hasChildren ? 'nav-item--has-menu' : ''}`}>
      <NavLink end prefetch="intent" to={item.url}>
        <span>{item.title}</span>
        {hasChildren && (
          <svg className="nav-chevron" width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
            <path d="M1 3L4 6L7 3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          </svg>
        )}
      </NavLink>

      {hasChildren && <MegaMenu item={item} />}
    </div>
  );
}

function MegaMenu({item}) {
  return (
    <div className="mega-menu" role="menu">
      <div className="mega-menu-inner">
        <div className="mega-menu-editorial">
          <span className="mega-menu-kicker">Curated edit</span>
          <h3>{item.title}</h3>
          <p>Clean silhouettes, premium everyday fits, and statement graphics for a modern clothing store.</p>
          <NavLink to={item.url} prefetch="intent">
            View all
            <span aria-hidden="true">&rarr;</span>
          </NavLink>
        </div>

        <div className="mega-menu-grid">
          {item.items.map((child) => (
            <NavLink to={child.url} className="mega-menu-item" key={child.id} prefetch="intent">
              <span className="mega-menu-item-title">{child.title}</span>
              <span className="mega-menu-item-desc">{child.description}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}

function MobileNav({isLoggedIn, localization}) {
  const {close} = useAside();
  const [openSubmenu, setOpenSubmenu] = useState(null);

  const handleToggle = (id) => {
    setOpenSubmenu(openSubmenu === id ? null : id);
  };

  return (
    <nav className="mobile-nav" role="navigation" aria-label="Mobile navigation">
      <div className="mobile-nav-header">
        <span className="mobile-nav-title">Menu</span>
        <span className="mobile-nav-subtitle">Baliza essentials</span>
      </div>

      <div className="mobile-nav-items">
        <NavLink end onClick={close} prefetch="intent" to="/" className="mobile-nav-item mobile-nav-item--home">
          Home
        </NavLink>

        {STORE_HEADER_MENU.items.map((item) => {
          const hasChildren = item.items.length > 0;

          if (hasChildren) {
            return (
              <div className="mobile-nav-group" key={item.id}>
                <button
                  className="mobile-nav-toggle"
                  onClick={() => handleToggle(item.id)}
                  aria-expanded={openSubmenu === item.id}
                >
                  <span>{item.title}</span>
                  <svg
                    className={`mobile-nav-arrow ${openSubmenu === item.id ? 'open' : ''}`}
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path d="M2 4L5 7L8 4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                  </svg>
                </button>

                <div className={`mobile-nav-submenu ${openSubmenu === item.id ? 'open' : ''}`}>
                  {item.items.map((child) => (
                    <NavLink key={child.id} to={child.url} onClick={close} className="mobile-nav-subitem" prefetch="intent">
                      <span>{child.title}</span>
                      <small>{child.description}</small>
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          }

          return (
            <NavLink className="mobile-nav-item" end key={item.id} onClick={close} prefetch="intent" to={item.url}>
              {item.title}
            </NavLink>
          );
        })}
      </div>

      <div className="mobile-nav-footer">
        <CountrySelector localization={localization} placement="mobile" />
        <NavLink to={isLoggedIn ? "/account" : "/account/login"} onClick={close} className="mobile-nav-footer-link">
          <AccountIcon />
          <span>{isLoggedIn ? 'My Account' : 'Sign In'}</span>
        </NavLink>
      </div>
    </nav>
  );
}

/**
 * @param {Pick<HeaderProps, 'isLoggedIn' | 'cart'>}
 */
function HeaderActions({cart, isLoggedIn}) {
  return (
    <Suspense fallback={<HeaderActionsContent cart={cart} isLoggedIn={false} />}>
      <Await resolve={isLoggedIn}>
        {(loggedIn) => (
          <HeaderActionsContent
            cart={cart}
            isLoggedIn={loggedIn}
          />
        )}
      </Await>
    </Suspense>
  );
}

function HeaderActionsContent({cart, isLoggedIn}) {
  return (
    <nav className="header-actions" aria-label="Header actions">
      <DesktopSearchForm />
      {isLoggedIn ? (
        <NavLink prefetch="intent" to="/account" className="header-action-link header-action-link--account" aria-label="Account">
          <AccountIcon />
        </NavLink>
      ) : (
        <NavLink prefetch="intent" to="/account/login" className="header-action-link header-action-link--account" aria-label="Sign in">
          <AccountIcon />
        </NavLink>
      )}
      <WishlistToggle />
      <SearchToggle />
      <CartToggle cart={cart} />
    </nav>
  );
}

export function CountrySelector({localization, placement = 'header'}) {
  const location = useLocation();
  const countries = localization?.availableCountries ?? [];
  const activeCountry = localization?.country?.isoCode ?? 'US';

  if (!countries.length) return null;

  return (
    <form className={`country-selector country-selector--${placement}`} action="/localization" method="post">
      <label className="sr-only" htmlFor={`country-selector-${placement}`}>
        Country/region
      </label>
      <span className="country-selector-icon" aria-hidden="true">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
          <circle cx="12" cy="12" r="9" />
          <path d="M3.6 9h16.8M3.6 15h16.8M12 3c2.2 2.5 3.3 5.5 3.3 9S14.2 18.5 12 21c-2.2-2.5-3.3-5.5-3.3-9S9.8 5.5 12 3Z" />
        </svg>
      </span>
      <input type="hidden" name="redirectTo" value={`${location.pathname}${location.search}`} />
      <select
        id={`country-selector-${placement}`}
        name="country"
        defaultValue={activeCountry}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        aria-label="Country/region"
      >
        {countries.map((country) => (
          <option key={country.isoCode} value={country.isoCode}>
            {country.name} ({country.currency?.isoCode})
          </option>
        ))}
      </select>
    </form>
  );
}

function DesktopSearchForm() {
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPlaceholderIndex((current) => (current + 1) % SEARCH_PLACEHOLDERS.length);
    }, 2200);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <form className="header-search-form" action="/search" method="get" role="search">
      <label className="sr-only" htmlFor="header-search">
        Search products
      </label>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="M16.5 16.5L21 21" strokeLinecap="round" />
      </svg>
      <span
        key={placeholderIndex}
        className={`header-search-form__hint ${isFocused || searchTerm ? 'is-hidden' : ''}`}
        aria-hidden="true"
      >
        {SEARCH_PLACEHOLDERS[placeholderIndex]}
      </span>
      <input
        id="header-search"
        name="q"
        type="search"
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.currentTarget.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder=""
        autoComplete="off"
      />
      <button type="submit">Search</button>
    </form>
  );
}

function MobileMenuToggle() {
  const {open} = useAside();
  return (
    <button className="mobile-menu-toggle" onClick={() => open('mobile')} aria-label="Open menu">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35" aria-hidden="true">
        <line x1="4" y1="7" x2="20" y2="7" />
        <line x1="4" y1="12" x2="20" y2="12" />
        <line x1="4" y1="17" x2="20" y2="17" />
      </svg>
    </button>
  );
}

function SearchToggle() {
  const {open} = useAside();
  return (
    <button className="header-action-btn header-action-btn--search" onClick={() => open('search')} aria-label="Search">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="M16.5 16.5L21 21" strokeLinecap="round" />
      </svg>
    </button>
  );
}

function AccountIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20c1.2-3.8 4.1-5.8 7.5-5.8s6.3 2 7.5 5.8" strokeLinecap="round" />
    </svg>
  );
}

/**
 * @param {{count: number}}
 */
function CartBadge({count}) {
  const {open} = useAside();
  const {publish, shop, cart, prevCart} = useAnalytics();

  return (
    <button
      className="header-action-btn header-action-btn--cart"
      onClick={(event) => {
        event.preventDefault();
        open('cart');
        publish('cart_viewed', {
          cart,
          prevCart,
          shop,
          url: window.location.href || '',
        });
      }}
      aria-label={`Shopping bag (${count} items)`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35" aria-hidden="true">
        <path d="M6.5 7.5h11l-1 13h-9l-1-13Z" strokeLinejoin="round" />
        <path d="M9 7.5V6a3 3 0 0 1 6 0v1.5" strokeLinecap="round" />
      </svg>
      <span className="cart-count">{count}</span>
    </button>
  );
}

function WishlistToggle() {
  const {count, hydrated} = useWishlist();
  const {open} = useAside();

  return (
    <button
      type="button"
      className="header-action-btn header-action-btn--wishlist"
      onClick={() => open('wishlist')}
      aria-label={`Wishlist (${hydrated ? count : 0} ${
        count === 1 ? 'item' : 'items'
      })`}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.35"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {hydrated && count > 0 ? (
        <span className="wishlist-count">{count}</span>
      ) : null}
    </button>
  );
}

/**
 * @param {Pick<HeaderProps, 'cart'>}
 */
function CartToggle({cart: originalCart}) {
  const cart = useOptimisticCart(originalCart);
  return <CartBadge count={cart?.totalQuantity ?? 0} />;
}

const STORE_HEADER_MENU = {
  items: [
    {
      id: 'new-in',
      title: 'New In',
      url: '/collections/new-arrivals',
      items: [],
    },
    {
      id: 'shop',
      title: 'Shop',
      url: '/collections/all',
      items: [
        {
          id: 'all-products',
          title: 'All Products',
          description: 'Complete clothing catalog',
          url: '/collections/all',
        },
        {
          id: 'graphic-tees',
          title: 'Graphic Tees',
          description: 'Statement prints and artwork',
          url: '/collections/graphic-tees',
        },
        {
          id: 'oversized',
          title: 'Oversized Fits',
          description: 'Relaxed premium silhouettes',
          url: '/collections/oversized',
        },
        {
          id: 'polo-tees',
          title: 'Polo T-Shirts',
          description: 'Clean everyday classics',
          url: '/collections/polo-shirts',
        },
      ],
    },
    {
      id: 'bestsellers',
      title: 'Bestsellers',
      url: '/collections/best-sellers',
      items: [],
    },
    {
      id: 'journal',
      title: 'Journal',
      url: '/blogs/journal',
      items: [],
    },
    {
      id: 'about',
      title: 'About',
      url: '/pages/about',
      items: [],
    },
  ],
};

const FEATURED_LINKS = [
  {id: 'tees', title: 'T-Shirts', url: '/collections/t-shirts'},
  {id: 'graphics', title: 'Graphics', url: '/collections/graphic-tees'},
  {id: 'polos', title: 'Polos', url: '/collections/polo-shirts'},
  {id: 'essentials', title: 'Essentials', url: '/collections/essentials'},
  {id: 'sale', title: 'Offers', url: '/offers'},
];

/** @typedef {'desktop' | 'mobile'} Viewport */
/**
 * @typedef {Object} HeaderProps
 * @property {HeaderQuery} header
 * @property {Promise<CartApiQueryFragment|null>} cart
 * @property {Promise<boolean>} isLoggedIn
 * @property {RootLocalization} localization
 * @property {string} publicStoreDomain
 */

/** @typedef {import('@shopify/hydrogen').CartViewPayload} CartViewPayload */
/** @typedef {import('storefrontapi.generated').HeaderQuery} HeaderQuery */
/** @typedef {import('storefrontapi.generated').CartApiQueryFragment} CartApiQueryFragment */
/** @typedef {import('storefrontapi.generated').LocalizationQuery['localization']} RootLocalization */

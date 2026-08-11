import {Await, Link} from 'react-router';
import {Suspense, useId} from 'react';
import {Aside} from '~/components/Aside';
import {Footer} from '~/components/Footer';
import {Header, HeaderMenu} from '~/components/Header';
import {CartMain} from '~/components/CartMain';
import {WishlistDrawer} from '~/components/WishlistDrawer';
import {CartProvider, useLiveCart} from '~/components/CartProvider';
import {
  SEARCH_ENDPOINT,
  SearchFormPredictive,
} from '~/components/SearchFormPredictive';
import {SearchResultsPredictive} from '~/components/SearchResultsPredictive';

/**
 * @param {PageLayoutProps}
 */
export function PageLayout({
  cart,
  children = null,
  footer,
  header,
  isLoggedIn,
  localization,
  publicStoreDomain,
}) {
  return (
    <CartProvider initialCart={cart}>
      <PageLayoutContent
        footer={footer}
        header={header}
        isLoggedIn={isLoggedIn}
        localization={localization}
        publicStoreDomain={publicStoreDomain}
      >
        {children}
      </PageLayoutContent>
    </CartProvider>
  );
}

function PageLayoutContent({
  children,
  footer,
  header,
  isLoggedIn,
  localization,
  publicStoreDomain,
}) {
  const {cart} = useLiveCart();

  return (
    <Aside.Provider>
      <CartAside />
      <SearchAside />
      <WishlistAside />
      <MobileMenuAside
        header={header}
        publicStoreDomain={publicStoreDomain}
        isLoggedIn={isLoggedIn}
        localization={localization}
      />
      {header && (
        <Header
          header={header}
          cart={cart}
          isLoggedIn={isLoggedIn}
          localization={localization}
          publicStoreDomain={publicStoreDomain}
        />
      )}
      <main>{children}</main>
      <Footer
        footer={footer}
        header={header}
        localization={localization}
        publicStoreDomain={publicStoreDomain}
      />
    </Aside.Provider>
  );
}

function CartAside() {
  const {cart} = useLiveCart();

  return (
    <Aside type="cart" heading="Shopping Bag">
      <CartMain cart={cart} layout="aside" />
    </Aside>
  );
}

function WishlistAside() {
  return (
    <Aside type="wishlist" heading="Wishlist">
      <WishlistDrawer />
    </Aside>
  );
}

function SearchAside() {
  const queriesDatalistId = useId();
  return (
    <Aside type="search" heading="Search">
      <div className="predictive-search">
        <SearchFormPredictive>
          {({fetchResults, goToSearch, inputRef}) => (
            <>
              <input
                className="site-input predictive-search__input"
                name="q"
                onChange={fetchResults}
                onFocus={fetchResults}
                placeholder="What are you looking for?"
                ref={inputRef}
                type="search"
                list={queriesDatalistId}
              />
              <button
                className="site-button predictive-search__submit"
                onClick={goToSearch}
              >
                Search
              </button>
            </>
          )}
        </SearchFormPredictive>

        <SearchResultsPredictive>
          {({items, total, term, state, closeSearch}) => {
            const {articles, collections, pages, products, queries} = items;

            if (state === 'loading' && term.current) {
              return <div className="site-loading">Loading...</div>;
            }

            if (!total) {
              return <SearchResultsPredictive.Empty term={term} />;
            }

            return (
              <>
                <SearchResultsPredictive.Queries
                  queries={queries}
                  queriesDatalistId={queriesDatalistId}
                />
                <SearchResultsPredictive.Products
                  products={products}
                  closeSearch={closeSearch}
                  term={term}
                />
                <SearchResultsPredictive.Collections
                  collections={collections}
                  closeSearch={closeSearch}
                  term={term}
                />
                <SearchResultsPredictive.Pages
                  pages={pages}
                  closeSearch={closeSearch}
                  term={term}
                />
                <SearchResultsPredictive.Articles
                  articles={articles}
                  closeSearch={closeSearch}
                  term={term}
                />
                {term.current && total ? (
                  <Link
                    className="site-link predictive-search__view-all"
                    onClick={closeSearch}
                    to={`${SEARCH_ENDPOINT}?q=${term.current}`}
                  >
                    View all results for &ldquo;{term.current}&rdquo; &rarr;
                  </Link>
                ) : null}
              </>
            );
          }}
        </SearchResultsPredictive>
      </div>
    </Aside>
  );
}

/**
 * @param {{
 *   header: PageLayoutProps['header'];
 *   publicStoreDomain: PageLayoutProps['publicStoreDomain'];
 *   isLoggedIn: PageLayoutProps['isLoggedIn'];
 *   localization: PageLayoutProps['localization'];
 * }}
 */
function MobileMenuAside({
  header,
  publicStoreDomain,
  isLoggedIn,
  localization,
}) {
  return (
    header.menu &&
    header.shop.primaryDomain?.url && (
      <Aside type="mobile" heading="Menu">
        <Suspense
          fallback={
            <HeaderMenu
              menu={header.menu}
              viewport="mobile"
              primaryDomainUrl={header.shop.primaryDomain.url}
              publicStoreDomain={publicStoreDomain}
              isLoggedIn={false}
              localization={localization}
            />
          }
        >
          <Await resolve={isLoggedIn}>
            {(loggedIn) => (
              <HeaderMenu
                menu={header.menu}
                viewport="mobile"
                primaryDomainUrl={header.shop.primaryDomain.url}
                publicStoreDomain={publicStoreDomain}
                isLoggedIn={loggedIn}
                localization={localization}
              />
            )}
          </Await>
        </Suspense>
      </Aside>
    )
  );
}

/**
 * @typedef {Object} PageLayoutProps
 * @property {Promise<CartApiQueryFragment|null>} cart
 * @property {Promise<FooterQuery|null>} footer
 * @property {HeaderQuery} header
 * @property {Promise<boolean>} isLoggedIn
 * @property {RootLocalization} localization
 * @property {string} publicStoreDomain
 * @property {React.ReactNode} [children]
 */

/** @typedef {import('storefrontapi.generated').CartApiQueryFragment} CartApiQueryFragment */
/** @typedef {import('storefrontapi.generated').FooterQuery} FooterQuery */
/** @typedef {import('storefrontapi.generated').HeaderQuery} HeaderQuery */
/** @typedef {import('storefrontapi.generated').LocalizationQuery['localization']} RootLocalization */

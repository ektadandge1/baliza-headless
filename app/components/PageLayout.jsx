import {Await, Link} from 'react-router';
import {Suspense, useId} from 'react';
import {Aside} from '~/components/Aside';
import {Footer} from '~/components/Footer';
import {Header, HeaderMenu} from '~/components/Header';
import {CartMain} from '~/components/CartMain';
import {WishlistDrawer} from '~/components/WishlistDrawer';
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
    <Aside.Provider>
      <CartAside cart={cart} />
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

/**
 * @param {{cart: PageLayoutProps['cart']}}
 */
function CartAside({cart}) {
  return (
    <Aside type="cart" heading="Shopping Bag">
      <Suspense fallback={<div style={{textAlign: 'center', padding: '2rem', color: '#999'}}>Loading cart...</div>}>
        <Await resolve={cart}>
          {(cart) => {
            return <CartMain cart={cart} layout="aside" />;
          }}
        </Await>
      </Suspense>
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
                name="q"
                onChange={fetchResults}
                onFocus={fetchResults}
                placeholder="What are you looking for?"
                ref={inputRef}
                type="search"
                list={queriesDatalistId}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #e5e5e5',
                  borderRadius: '6px',
                  fontSize: '15px',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
              <button
                onClick={goToSearch}
                style={{
                  width: '100%',
                  padding: '12px',
                  marginTop: '8px',
                  background: '#111',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontFamily: 'inherit',
                }}
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
              return <div style={{textAlign: 'center', padding: '2rem', color: '#999'}}>Loading...</div>;
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
                    onClick={closeSearch}
                    to={`${SEARCH_ENDPOINT}?q=${term.current}`}
                    style={{
                      display: 'block',
                      textAlign: 'center',
                      padding: '12px',
                      marginTop: '16px',
                      color: '#c9a96e',
                      fontWeight: '600',
                      textDecoration: 'none',
                      fontSize: '14px',
                    }}
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
function MobileMenuAside({header, publicStoreDomain, isLoggedIn, localization}) {
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

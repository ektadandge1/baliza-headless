import {redirect, useLoaderData, useSearchParams, Link} from 'react-router';
import {getPaginationVariables, Analytics} from '@shopify/hydrogen';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {ProductItem} from '~/components/ProductItem';
import {getAllReviews, buildRatingsMap, judgeMeEnabled} from '~/lib/judgeMe';
import {CollectionSort} from '~/components/CollectionSort';
import {CollectionFilters} from '~/components/CollectionFilters';
import {useState, useMemo} from 'react';

const SORT_OPTIONS = [
  {label: 'Best Selling', value: 'best-selling'},
  {label: 'Price: Low to High', value: 'price-ascending'},
  {label: 'Price: High to Low', value: 'price-descending'},
  {label: 'Newest', value: 'created-descending'},
  {label: 'Name: A-Z', value: 'title-ascending'},
  {label: 'Name: Z-A', value: 'title-descending'},
];

function getSortValue(sp) {
  return sp.get('sort') || 'best-selling';
}

function getActiveFilters(sp) {
  const out = [];
  for (const [key, value] of sp.entries()) {
    if (['sort', 'view', 'q', 'page'].includes(key)) continue;
    out.push({key, value});
  }
  return out;
}

function getFilterParam(sp, key) {
  const vals = sp.getAll(key);
  if (vals.length === 0) return null;
  return vals;
}

function normalizeOptionFilterValue(optionKey, value) {
  const raw = String(value || '').trim();
  if (optionKey === 'size') {
    return raw
      .toUpperCase()
      .replace(/\s+/g, '')
      .replace(/^2X$/, 'XXL')
      .replace(/^2XL$/, 'XXL')
      .replace(/^XXXL$/, '3XL');
  }

  if (optionKey === 'color') {
    const norm = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
    const colors = ['white', 'black', 'navy', 'blue', 'grey', 'gray', 'red', 'green', 'olive', 'beige', 'cream', 'brown', 'pink', 'yellow', 'orange', 'purple'];
    const color = colors.find((name) => norm.includes(name));
    if (color) return color === 'grey' ? 'Gray' : color.charAt(0).toUpperCase() + color.slice(1);
  }

  return raw
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function clientFilterProducts(products, searchParams) {
  if (!products?.length) return products;
  const hasFilters = getActiveFilters(searchParams).length > 0;
  if (!hasFilters) return products;

  return products.filter((product) => {
    const price = parseFloat(product.priceRange?.minVariantPrice?.amount);
    const maxPrice = parseFloat(product.priceRange?.maxVariantPrice?.amount);

    const priceMin = searchParams.get('price_min');
    const priceMax = searchParams.get('price_max');
    if (priceMin && price < parseFloat(priceMin)) return false;
    if (priceMax && maxPrice > parseFloat(priceMax)) return false;

    const availability = searchParams.get('available');
    if (availability === 'true') {
      const inStock = product.variants?.nodes?.some((v) => v.availableForSale);
      if (!inStock) return false;
    }

    const colorFilters = getFilterParam(searchParams, 'color');
    if (colorFilters) {
      const productColors = new Set();
      for (const variant of product.variants?.nodes ?? []) {
        for (const opt of variant.selectedOptions ?? []) {
          if (/colou?r/i.test(opt.name)) {
            productColors.add(normalizeOptionFilterValue('color', opt.value));
          }
        }
      }
      const matches = colorFilters.some((c) => productColors.has(c));
      if (!matches) return false;
    }

    const sizeFilters = getFilterParam(searchParams, 'size');
    if (sizeFilters) {
      const productSizes = new Set();
      for (const variant of product.variants?.nodes ?? []) {
        for (const opt of variant.selectedOptions ?? []) {
          if (/size/i.test(opt.name)) {
            productSizes.add(normalizeOptionFilterValue('size', opt.value));
          }
        }
      }
      const matches = sizeFilters.some((s) => productSizes.has(s));
      if (!matches) return false;
    }

    const productTypeFilters = getFilterParam(searchParams, 'product_type');
    if (productTypeFilters) {
      if (!productTypeFilters.includes(product.productType)) return false;
    }

    const vendorFilters = getFilterParam(searchParams, 'vendor');
    if (vendorFilters) {
      if (!vendorFilters.includes(product.vendor)) return false;
    }

    const otherOptionKeys = ['color', 'size', 'product_type', 'vendor', 'price_min', 'price_max', 'available'];
    for (const [key] of searchParams.entries()) {
      if (otherOptionKeys.includes(key)) continue;
      const vals = getFilterParam(searchParams, key);
      if (!vals) continue;
      const normalizedKey = key.replace(/_/g, ' ').toLowerCase();
      const productOptionValues = new Set();
      for (const variant of product.variants?.nodes ?? []) {
        for (const opt of variant.selectedOptions ?? []) {
          if (opt.name.toLowerCase() === normalizedKey) {
            productOptionValues.add(normalizeOptionFilterValue(key, opt.value));
          }
        }
      }
      const matches = vals.some((v) => productOptionValues.has(v));
      if (!matches) return false;
    }

    return true;
  });
}

/**
 * @type {Route.MetaFunction}
 */
export const meta = ({data}) => [
  {title: `Baliza | ${data?.collection.title ?? ''} Collection`},
];

/** @param {Route.LoaderArgs} args */
export async function loader(args) {
  const deferredData = loadDeferredData(args);
  const criticalData = await loadCriticalData(args);
  return {...deferredData, ...criticalData};
}

async function loadCriticalData({context, params, request}) {
  const {handle} = params;
  const {storefront} = context;

  const paginationVariables = getPaginationVariables(request, {pageBy: 12});

  if (!handle) throw redirect('/collections');

  let {collection} = await storefront.query(COLLECTION_QUERY, {
    variables: {
      handle,
      ...paginationVariables,
    },
  });

  if (!collection) {
    const {products} = await storefront.query(FALLBACK_COLLECTION_QUERY, {
      variables: paginationVariables,
    });

    collection = {
      id: `fallback-${handle}`,
      handle,
      title: titleFromHandle(handle),
      description: 'Browse our curated edit of premium everyday essentials.',
      products,
    };
  } else {
    redirectIfHandleIsLocalized(request, {handle, data: collection});
  }

  const ratings = judgeMeEnabled(context.env)
    ? buildRatingsMap(await getAllReviews(context.env))
    : {};

  const judgeMeWidgetEnabled = Boolean(
    context.env.JUDGEME_SHOP_DOMAIN && context.env.JUDGEME_PUBLIC_TOKEN,
  );

  return {
    collection,
    ratings,
    judgeMeWidgetEnabled,
  };
}

function titleFromHandle(handle) {
  return handle
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function loadDeferredData() {
  return {};
}

export default function Collection() {
  const {collection, ratings, judgeMeWidgetEnabled} = useLoaderData();
  const [searchParams, setSearchParams] = useSearchParams();
  const sortValue = getSortValue(searchParams);
  const viewMode = searchParams.get('view') || 'grid';
  const searchQuery = searchParams.get('q') || '';
  const activeFilters = getActiveFilters(searchParams);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery);

  const handleSortChange = (v) => {
    const next = new URLSearchParams(searchParams);
    next.set('sort', v);
    next.delete('page');
    setSearchParams(next);
  };

  const handleViewToggle = (mode) => {
    const next = new URLSearchParams(searchParams);
    next.set('view', mode);
    setSearchParams(next);
  };

  const handleFilterChange = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value === null || value === '' || value === undefined) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    next.delete('page');
    setSearchParams(next);
  };

  const handleToggleFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    const existing = next.getAll(key);
    if (existing.includes(value)) {
      next.delete(key);
      existing.filter((v) => v !== value).forEach((v) => next.append(key, v));
    } else {
      next.append(key, value);
    }
    next.delete('page');
    setSearchParams(next);
  };

  const handlePriceApply = (min, max) => {
    const next = new URLSearchParams(searchParams);
    if (min) next.set('price_min', min);
    else next.delete('price_min');
    if (max) next.set('price_max', max);
    else next.delete('price_max');
    next.delete('page');
    setSearchParams(next);
  };

  const handleClearAllFilters = () => {
    const next = new URLSearchParams();
    const sort = searchParams.get('sort');
    const view = searchParams.get('view');
    if (sort) next.set('sort', sort);
    if (view) next.set('view', view);
    setSearchParams(next);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const next = new URLSearchParams(searchParams);
    if (localSearch.trim()) next.set('q', localSearch.trim());
    else next.delete('q');
    next.delete('page');
    setSearchParams(next);
  };

  const handleRemoveFilter = (key, value) => {
    const current = searchParams.getAll(key);
    if (current.length > 1) {
      const next = new URLSearchParams(searchParams);
      const filtered = current.filter((v) => v !== value);
      next.delete(key);
      filtered.forEach((v) => next.append(key, v));
      next.delete('page');
      setSearchParams(next);
    } else {
      handleFilterChange(key, null);
    }
  };

  const productCount = collection.products?.nodes?.length ?? 0;
  const filteredProducts = useMemo(
    () => clientFilterProducts(collection.products?.nodes ?? [], searchParams),
    [collection.products?.nodes, searchParams],
  );
  const hasActiveFilters = activeFilters.length > 0;
  const displayedCount = hasActiveFilters ? filteredProducts.length : productCount;

  return (
    <div className="collection-advanced">
      {/* Hero */}
      <div className="collection-hero">
        <div className="collection-hero__inner">
          <nav className="collection-breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span aria-hidden="true">/</span>
            <Link to="/collections">Collections</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{collection.title}</span>
          </nav>
          <h1 className="collection-hero__title">{collection.title}</h1>
        </div>
      </div>

      {/* Toolbar */}
      <div className="collection-toolbar">
        <div className="collection-toolbar__left">
          <button
            type="button"
            className="collection-toolbar__filter-toggle"
            onClick={() => setMobileFiltersOpen(true)}
            aria-label="Open filters"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
              <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
              <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" />
              <line x1="17" y1="16" x2="23" y2="16" />
            </svg>
            Filters
            {activeFilters.length > 0 && (
              <span className="filter-count-badge">{activeFilters.length}</span>
            )}
          </button>
          <span className="collection-toolbar__count">
            {displayedCount} {displayedCount === 1 ? 'product' : 'products'}
            {hasActiveFilters && productCount !== displayedCount && (
              <span className="collection-toolbar__count-total"> (of {productCount})</span>
            )}
          </span>
        </div>

        <div className="collection-toolbar__right">
          <form className="collection-search" onSubmit={handleSearch} role="search">
            <input
              type="search"
              placeholder="Search in collection..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="collection-search__input"
              aria-label={`Search in ${collection.title}`}
            />
            <button type="submit" className="collection-search__btn" aria-label="Search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
            {searchQuery && (
              <button
                type="button"
                className="collection-search__clear"
                onClick={() => {
                  setLocalSearch('');
                  const next = new URLSearchParams(searchParams);
                  next.delete('q');
                  next.delete('page');
                  setSearchParams(next);
                }}
                aria-label="Clear search"
              >
                &times;
              </button>
            )}
          </form>

          <CollectionSort
            options={SORT_OPTIONS}
            value={sortValue}
            onChange={handleSortChange}
          />

          <div className="collection-view-toggle" role="group" aria-label="View mode">
            <button
              type="button"
              className={`view-btn ${viewMode === 'grid' ? 'is-active' : ''}`}
              onClick={() => handleViewToggle('grid')}
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </button>
            <button
              type="button"
              className={`view-btn ${viewMode === 'list' ? 'is-active' : ''}`}
              onClick={() => handleViewToggle('list')}
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="3" y="4" width="18" height="4" rx="1" /><rect x="3" y="10" width="18" height="4" rx="1" />
                <rect x="3" y="16" width="18" height="4" rx="1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Active Filter Pills */}
      {activeFilters.length > 0 && (
        <div className="collection-active-filters">
          {activeFilters.map(({key, value}) => (
            <button
              key={`${key}-${value}`}
              type="button"
              className="filter-pill"
              onClick={() => handleRemoveFilter(key, value)}
            >
              <span className="filter-pill__label">{key.replace(/_/g, ' ')}: {value}</span>
              <span className="filter-pill__remove" aria-hidden="true">&times;</span>
            </button>
          ))}
          <button
            type="button"
            className="filter-pill filter-pill--clear"
            onClick={handleClearAllFilters}
          >
            Clear all
          </button>
        </div>
      )}

      {/* Content */}
      <div className="collection-content">
        {/* Desktop sidebar */}
        <aside className="collection-sidebar" aria-label="Product filters">
          <div className="collection-sidebar__header">
            <h2 className="collection-sidebar__title">Filters</h2>
            {activeFilters.length > 0 && (
              <button
                type="button"
                className="collection-sidebar__clear"
                onClick={handleClearAllFilters}
              >
                Clear all ({activeFilters.length})
              </button>
            )}
          </div>
          <CollectionFilters
            collectionHandle={collection.handle}
            products={collection.products?.nodes ?? []}
            searchParams={searchParams}
            onFilterChange={handleFilterChange}
            onToggleFilter={handleToggleFilter}
            onPriceApply={handlePriceApply}
          />
        </aside>

        {/* Products */}
        <div className="collection-products">
          {hasActiveFilters ? (
            filteredProducts.length > 0 ? (
              <div
                className={
                  viewMode === 'grid'
                    ? 'products-grid products-grid--3'
                    : 'products-list'
                }
              >
                {filteredProducts.map((product, index) => (
                  <ProductItem
                    key={product.id}
                    product={product}
                    ratings={ratings}
                    judgeMeBadge={judgeMeWidgetEnabled}
                    loading={index < 3 ? 'eager' : 'lazy'}
                  />
                ))}
              </div>
            ) : (
              <div className="collection-empty">
                <p>No products match your current filters.</p>
                <button
                  type="button"
                  className="collection-empty__clear"
                  onClick={handleClearAllFilters}
                >
                  Clear all filters
                </button>
              </div>
            )
          ) : (
            <PaginatedResourceSection
              connection={collection.products}
              resourcesClassName={
                viewMode === 'grid'
                  ? 'products-grid products-grid--3'
                  : 'products-list'
              }
            >
              {({node: product, index}) => (
                <ProductItem
                  key={product.id}
                  product={product}
                  ratings={ratings}
                  judgeMeBadge={judgeMeWidgetEnabled}
                  loading={index < 3 ? 'eager' : 'lazy'}
                />
              )}
            </PaginatedResourceSection>
          )}
        </div>
      </div>

      {/* Mobile filter drawer — outside grid to avoid layout disruption */}
      {mobileFiltersOpen && (
        <div
          className="filter-drawer-overlay"
          onClick={() => setMobileFiltersOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setMobileFiltersOpen(false)}
          role="button"
          tabIndex={0}
          aria-label="Close filters"
        />
      )}
      <div
        className={`filter-drawer ${mobileFiltersOpen ? 'is-open' : ''}`}
        role="dialog"
        aria-label="Filter products"
      >
        <div className="filter-drawer__header">
          <h2>Filters</h2>
          <button
            type="button"
            className="filter-drawer__close"
            onClick={() => setMobileFiltersOpen(false)}
            aria-label="Close filters"
          >
            &times;
          </button>
        </div>
        <div className="filter-drawer__body">
          <CollectionFilters
            collectionHandle={collection.handle}
            products={collection.products?.nodes ?? []}
            searchParams={searchParams}
            onFilterChange={handleFilterChange}
            onToggleFilter={handleToggleFilter}
            onPriceApply={handlePriceApply}
          />
        </div>
        <div className="filter-drawer__footer">
          <button
            type="button"
            className="filter-drawer__apply"
            onClick={() => setMobileFiltersOpen(false)}
          >
            Show Results
          </button>
        </div>
      </div>

      <Analytics.CollectionView
        data={{
          collection: {
            id: collection.id,
            handle: collection.handle,
          },
        }}
      />
    </div>
  );
}

const PRODUCT_ITEM_FRAGMENT = `#graphql
  fragment MoneyProductItem on MoneyV2 {
    amount
    currencyCode
  }
  fragment ProductItem on Product {
    id
    handle
    title
    productType
    vendor
    featuredImage {
      id
      altText
      url
      width
      height
    }
    priceRange {
      minVariantPrice {
        ...MoneyProductItem
      }
      maxVariantPrice {
        ...MoneyProductItem
      }
    }
    compareAtPriceRange {
      minVariantPrice {
        ...MoneyProductItem
      }
    }
    variants(first: 20) {
      nodes {
        id
        title
        availableForSale
        selectedOptions {
          name
          value
        }
        price {
          ...MoneyProductItem
        }
        compareAtPrice {
          ...MoneyProductItem
        }
      }
    }
  }
`;

const COLLECTION_QUERY = `#graphql
  ${PRODUCT_ITEM_FRAGMENT}
  query Collection(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      products(
        first: $first,
        last: $last,
        before: $startCursor,
        after: $endCursor
      ) {
        nodes {
          ...ProductItem
        }
        pageInfo {
          hasPreviousPage
          hasNextPage
          endCursor
          startCursor
        }
      }
    }
  }
`;

const FALLBACK_COLLECTION_QUERY = `#graphql
  ${PRODUCT_ITEM_FRAGMENT}
  query FallbackCollection(
    $country: CountryCode
    $language: LanguageCode
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
  ) @inContext(country: $country, language: $language) {
    products(
      first: $first,
      last: $last,
      before: $startCursor,
      after: $endCursor
    ) {
      nodes {
        ...ProductItem
      }
      pageInfo {
        hasPreviousPage
        hasNextPage
        endCursor
        startCursor
      }
    }
  }
`;

/** @typedef {import('./+types/collections.$handle').Route} Route */
/** @typedef {import('storefrontapi.generated').ProductItemFragment} ProductItemFragment */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */

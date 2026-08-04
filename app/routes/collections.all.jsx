import {useLoaderData, useSearchParams, Link} from 'react-router';
import {ProductItem} from '~/components/ProductItem';
import {getAllReviews, buildRatingsMap, judgeMeEnabled} from '~/lib/judgeMe';
import {CollectionSort} from '~/components/CollectionSort';
import {CollectionFilters} from '~/components/CollectionFilters';
import {CollectionPagination} from '~/components/CollectionPagination';
import {useMemo, useState} from 'react';

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

function normalizeValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
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

function getProductOptionValues(product, optionKey) {
  const values = new Set();

  for (const variant of product.variants?.nodes ?? []) {
    for (const option of variant.selectedOptions ?? []) {
      const optionName = normalizeValue(option.name);
      const matchesKey = optionKey === 'color'
        ? /colou?r/i.test(option.name)
        : optionKey === 'size'
          ? /size/i.test(option.name)
          : optionName === optionKey;

      if (matchesKey) {
        values.add(normalizeOptionFilterValue(optionKey, option.value));
      }
    }
  }

  return [...values];
}

function matchesFilters(product, searchParams) {
  const productTypeFilters = searchParams.getAll('product_type');
  if (
    productTypeFilters.length > 0 &&
    !productTypeFilters.some((value) => value === product.productType)
  ) {
    return false;
  }

  const vendorFilters = searchParams.getAll('vendor');
  if (vendorFilters.length > 0 && !vendorFilters.some((value) => value === product.vendor)) {
    return false;
  }

  const available = searchParams.get('available');
  if (available === 'true') {
    const inStock = product.variants?.nodes?.some((variant) => variant.availableForSale);
    if (!inStock) return false;
  }

  const minPriceParam = searchParams.get('price_min');
  const maxPriceParam = searchParams.get('price_max');
  const minPrice = minPriceParam ? Number(minPriceParam) : null;
  const maxPrice = maxPriceParam ? Number(maxPriceParam) : null;
  const price = Number(product.priceRange?.minVariantPrice?.amount || 0);
  if (minPrice !== null && !Number.isNaN(minPrice) && price < minPrice) return false;
  if (maxPrice !== null && !Number.isNaN(maxPrice) && price > maxPrice) return false;

  const filterMap = new Map();
  for (const [key, value] of searchParams.entries()) {
    if (['sort', 'view', 'q', 'page', 'product_type', 'vendor', 'available', 'price_min', 'price_max'].includes(key)) {
      continue;
    }

    if (!filterMap.has(key)) filterMap.set(key, []);
    filterMap.get(key).push(value);
  }

  for (const [key, values] of filterMap.entries()) {
    const optionValues = key === 'color'
      ? getProductOptionValues(product, 'color')
      : getProductOptionValues(product, key);

    if (!values.some((value) => optionValues.includes(value))) {
      return false;
    }
  }

  return true;
}

function sortProducts(products, sortValue) {
  const sorted = [...products];

  sorted.sort((a, b) => {
    const priceA = Number(a.priceRange?.minVariantPrice?.amount || 0);
    const priceB = Number(b.priceRange?.minVariantPrice?.amount || 0);
    const titleA = a.title || '';
    const titleB = b.title || '';
    const dateA = new Date(a.createdAt || a.publishedAt || 0).getTime();
    const dateB = new Date(b.createdAt || b.publishedAt || 0).getTime();

    switch (sortValue) {
      case 'price-ascending':
        return priceA - priceB;
      case 'price-descending':
        return priceB - priceA;
      case 'title-ascending':
        return titleA.localeCompare(titleB);
      case 'title-descending':
        return titleB.localeCompare(titleA);
      case 'created-descending':
        return dateB - dateA;
      default:
        return 0;
    }
  });

  return sorted;
}

/**
 * @type {Route.MetaFunction}
 */
export const meta = () => [{title: 'Baliza | All Products'}];

/** @param {Route.LoaderArgs} args */
export async function loader({context, request}) {
  const {storefront} = context;
  const url = new URL(request.url);
  const searchQuery = url.searchParams.get('q') || '';

  const variables = {first: 250};
  if (searchQuery) variables.query = searchQuery;

  const {products} = await storefront.query(CATALOG_QUERY, {
    variables,
  });

  if (!products) {
    throw new Response('Products not found', {status: 404});
  }

  const ratings = judgeMeEnabled(context.env)
    ? buildRatingsMap(await getAllReviews(context.env))
    : {};

  const judgeMeWidgetEnabled = Boolean(
    context.env.JUDGEME_SHOP_DOMAIN && context.env.JUDGEME_PUBLIC_TOKEN,
  );

  return {products, ratings, judgeMeWidgetEnabled};
}

export default function AllProducts() {
  const {products, ratings, judgeMeWidgetEnabled} = useLoaderData();
  const [searchParams, setSearchParams] = useSearchParams();
  const sortValue = getSortValue(searchParams);
  const viewMode = searchParams.get('view') || 'grid';
  const searchQuery = searchParams.get('q') || '';
  const activeFilters = getActiveFilters(searchParams);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const pageSize = 12;

  const filteredProducts = useMemo(() => {
    const nodes = products?.nodes ?? [];
    return sortProducts(
      nodes.filter((product) => matchesFilters(product, searchParams)),
      sortValue,
    );
  }, [products, searchParams, sortValue]);
  const currentPage = Math.max(Number(searchParams.get('page')) || 1, 1);
  const visibleProducts = filteredProducts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

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
    if (value === null || value === '' || value === undefined) next.delete(key);
    else next.set(key, value);
    next.delete('page');
    setSearchParams(next);
  };

  const handleToggleFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    const currentValues = next.getAll(key);

    next.delete(key);

    if (currentValues.includes(value)) {
      currentValues
        .filter((currentValue) => currentValue !== value)
        .forEach((currentValue) => next.append(key, currentValue));
    } else {
      currentValues.forEach((currentValue) => next.append(key, currentValue));
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

  const productCount = filteredProducts.length;

  return (
    <div className="collection-advanced">
      {/* Hero */}
      <div className="collection-hero">
        <div className="collection-hero__inner">
          <nav className="collection-breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">All Products</span>
          </nav>
          <h1 className="collection-hero__title">All Products</h1>
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
            {productCount} {productCount === 1 ? 'product' : 'products'}
          </span>
        </div>

        <div className="collection-toolbar__right">
          <form className="collection-search" onSubmit={handleSearch} role="search">
            <input
              type="search"
              placeholder="Search products..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="collection-search__input"
              aria-label="Search products"
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
        <aside className="collection-sidebar" aria-label="Product filters">
          <CollectionFilters
            products={products.nodes ?? []}
            searchParams={searchParams}
            onFilterChange={handleFilterChange}
            onToggleFilter={handleToggleFilter}
            onPriceApply={handlePriceApply}
          />
        </aside>

        <div className="collection-products">
          <div
            className={
              viewMode === 'grid'
                ? 'products-grid products-grid--3'
                : 'products-list'
            }
          >
            {visibleProducts.map((product, index) => (
              <ProductItem
                key={product.id}
                product={product}
                ratings={ratings}
                judgeMeBadge={judgeMeWidgetEnabled}
                loading={index < 3 ? 'eager' : 'lazy'}
              />
            ))}
          </div>
          <CollectionPagination
            totalItems={filteredProducts.length}
            pageSize={pageSize}
          />
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
            products={products.nodes ?? []}
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
    </div>
  );
}

const COLLECTION_ITEM_FRAGMENT = `#graphql
  fragment MoneyCollectionItem on MoneyV2 {
    amount
    currencyCode
  }
  fragment CollectionItem on Product {
    id
    createdAt
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
        ...MoneyCollectionItem
      }
      maxVariantPrice {
        ...MoneyCollectionItem
      }
    }
    compareAtPriceRange {
      minVariantPrice {
        ...MoneyCollectionItem
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
          ...MoneyCollectionItem
        }
        compareAtPrice {
          ...MoneyCollectionItem
        }
      }
    }
  }
`;

const CATALOG_QUERY = `#graphql
  ${COLLECTION_ITEM_FRAGMENT}
  query Catalog(
    $country: CountryCode
    $language: LanguageCode
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
    $query: String
  ) @inContext(country: $country, language: $language) {
    products(
      first: $first,
      last: $last,
      before: $startCursor,
      after: $endCursor,
      query: $query
    ) {
      nodes {
        ...CollectionItem
      }
      pageInfo {
        hasPreviousPage
        hasNextPage
        startCursor
        endCursor
      }
    }
  }
`;

/** @typedef {import('./+types/collections.all').Route} Route */
/** @typedef {import('storefrontapi.generated').CollectionItemFragment} CollectionItemFragment */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */

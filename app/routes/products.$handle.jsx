import {Suspense, useEffect, useMemo, useState} from 'react';
import {Await, Link, useLoaderData} from 'react-router';
import {
  getSelectedProductOptions,
  Analytics,
  useOptimisticVariant,
  getProductOptions,
  getAdjacentAndFirstAvailableVariants,
  useSelectedOptionInUrlParam,
} from '@shopify/hydrogen';
import {ProductPrice} from '~/components/ProductPrice';
import {ProductGallery} from '~/components/ProductGallery';
import {ProductForm} from '~/components/ProductForm';
import {ProductItem} from '~/components/ProductItem';
import {ProductReviews} from '~/components/ProductReviews';
import {Stars} from '~/components/Stars';
import {DeliveryEstimator} from '~/components/DeliveryEstimator';
import {JudgeMeReviewWidget} from '~/components/JudgeMe';
import {WishlistButton} from '~/components/WishlistButton';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {
  getAllReviews,
  getProductReviews,
  getExternalId,
  judgeMeEnabled,
} from '~/lib/judgeMe';

/**
 * @type {Route.MetaFunction}
 */
export const meta = ({data}) => {
  return [
    {title: `Hydrogen | ${data?.product.title ?? ''}`},
    {
      rel: 'canonical',
      href: `/products/${data?.product.handle}`,
    },
  ];
};

/**
 * @param {Route.LoaderArgs} args
 */
export async function loader(args) {
  // Start fetching review data without blocking time to first byte.
  const reviewData = loadReviewData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);
  const deferredData = loadDeferredData(args, criticalData.product.id);

  return {...reviewData, ...deferredData, ...criticalData};
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 * @param {Route.LoaderArgs}
 */
async function loadCriticalData({context, params, request}) {
  const {handle} = params;
  const {storefront} = context;

  if (!handle) {
    throw new Error('Expected product handle to be defined');
  }

  const {product} = await storefront.query(PRODUCT_QUERY, {
    variables: {handle, selectedOptions: getSelectedProductOptions(request)},
  });

  if (!product?.id) {
    throw new Response(null, {status: 404});
  }

  // The API handle might be localized, so redirect to the localized handle
  redirectIfHandleIsLocalized(request, {handle, data: product});

  return {
    product,
  };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 * @param {Route.LoaderArgs}
 */
function loadReviewData({context}) {
  // Put any API calls that is not critical to be available on first page render
  // For example: product reviews, product recommendations, social feeds.
  const env = context.env;

  const judgeMeWidgetEnabled = Boolean(
    env.JUDGEME_SHOP_DOMAIN && env.JUDGEME_PUBLIC_TOKEN,
  );

  if (!judgeMeEnabled(env)) {
    return {
      judgeMeReviews: [],
      judgeMeShopDomain: undefined,
      judgeMeWidgetEnabled,
    };
  }

  return {
    judgeMeReviews: getAllReviews(env).catch(() => []),
    judgeMeShopDomain: env.JUDGEME_SHOP_DOMAIN,
    judgeMeWidgetEnabled,
  };
}

function loadDeferredData({context}, productId) {
  const {storefront} = context;

  return {
    bestSellers: storefront
      .query(PRODUCT_BEST_SELLERS_QUERY, {
        variables: {first: 8},
      })
      .then((data) => data.products)
      .catch(() => ({nodes: []})),
    recommendedProducts: storefront
      .query(PRODUCT_RECOMMENDATIONS_QUERY, {
        variables: {productId},
      })
      .then((data) => data.productRecommendations ?? [])
      .catch(() => []),
  };
}

export default function Product() {
  /** @type {LoaderReturnData} */
  const {
    product,
    bestSellers,
    recommendedProducts,
    judgeMeReviews,
    judgeMeShopDomain,
    judgeMeWidgetEnabled,
  } = useLoaderData();

  // Optimistically selects a variant with given available variant information
  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );

  // Sets the search param to the selected variant without navigation
  // only when no search params are set in the url
  useSelectedOptionInUrlParam(selectedVariant.selectedOptions);

  // Get the product options array
  const productOptions = getProductOptions({
    ...product,
    selectedOrFirstAvailableVariant: selectedVariant,
  });

  const {title, descriptionHtml, vendor} = product;
  const currentProductCard = useMemo(
    () => getProductCardData(product),
    [product],
  );

  return (
    <div className="product-page">
      <div className="product product--premium">
        <ProductGallery
          images={product.media?.nodes
            ?.map((media) => media.image)
            .filter(Boolean)}
          selectedImage={selectedVariant?.image}
        />
        <section className="product-main" aria-label="Product information">
          <div className="product-main__eyebrow">
            <span className="product-main__badge">Product details</span>
            {vendor ? <span className="product-vendor">{vendor}</span> : null}
          </div>

          <h1>{title}</h1>

          <div className="product-main__meta">
            <ProductReviewSummary
              productId={product.id}
              reviews={judgeMeReviews}
            />
            {selectedVariant ? (
              <small
                className={`product-main__stock ${
                  selectedVariant.availableForSale
                    ? 'product-main__stock--available'
                    : 'product-main__stock--soldout'
                }`}
              >
                {selectedVariant.availableForSale ? 'In stock' : 'Sold out'}
              </small>
            ) : null}
          </div>

          <div className="product-main__price-row">
            <ProductPrice
              price={selectedVariant?.price}
              compareAtPrice={selectedVariant?.compareAtPrice}
            />
            <WishlistButton
              product={{
                id: product.id,
                handle: product.handle,
                title: product.title,
                featuredImage: selectedVariant?.image,
                priceRange: {minVariantPrice: selectedVariant?.price},
                variants: {nodes: product.adjacentVariants},
              }}
              variantId={selectedVariant?.id}
            />
          </div>

          <DeliveryEstimator price={selectedVariant?.price} />

          <ProductForm
            productOptions={productOptions}
            selectedVariant={selectedVariant}
          />

          <details className="product-detail-drawer">
            <summary>Description</summary>
            <div
              className="product-description-prose"
              dangerouslySetInnerHTML={{__html: descriptionHtml}}
            />
          </details>

          <details className="product-detail-drawer">
            <summary>Size & Fit</summary>
            <p>
              Choose your usual size for a regular fit. Size availability
              updates instantly based on the selected variant.
            </p>
          </details>
        </section>
      </div>

      <DeferredProductMerchandising
        product={product}
        currentProductCard={currentProductCard}
        bestSellers={bestSellers}
        recommendedProducts={recommendedProducts}
        ratings={undefined}
        judgeMeBadge={judgeMeWidgetEnabled}
      />

      {judgeMeWidgetEnabled ? (
        <div id="product-reviews">
          <JudgeMeReviewWidget id={product.id} title={product.title} />
        </div>
      ) : (
        <div id="product-reviews">
          <DeferredProductReviews
            reviews={judgeMeReviews}
            shopDomain={judgeMeShopDomain}
            productId={product.id}
            productHandle={product.handle}
            productTitle={product.title}
          />
        </div>
      )}

      <Analytics.ProductView
        data={{
          products: [
            {
              id: product.id,
              title: product.title,
              price: selectedVariant?.price.amount || '0',
              vendor: product.vendor,
              variantId: selectedVariant?.id || '',
              variantTitle: selectedVariant?.title || '',
              quantity: 1,
            },
          ],
        }}
      />
    </div>
  );
}

function ProductReviewSummary({productId, reviews}) {
  return (
    <Suspense
      fallback={
        <span className="product-main__rating product-main__rating--empty">
          <a href="#product-reviews">Reviews</a>
        </span>
      }
    >
      <Await resolve={reviews}>
        {(resolvedReviews) => {
          const productReviews = getProductReviews(
            resolvedReviews ?? [],
            getExternalId(productId),
          );
          const reviewTotal = productReviews.length;
          const reviewAverage = reviewTotal
            ? productReviews.reduce(
                (sum, review) => sum + (review.rating || 0),
                0,
              ) / reviewTotal
            : 0;

          return reviewTotal ? (
            <span className="product-main__rating">
              <Stars value={reviewAverage} size={13} />
              <strong>{reviewAverage.toFixed(1)}</strong>
              <a href="#product-reviews">
                {reviewTotal} review{reviewTotal > 1 ? 's' : ''}
              </a>
            </span>
          ) : (
            <span className="product-main__rating product-main__rating--empty">
              No reviews yet
            </span>
          );
        }}
      </Await>
    </Suspense>
  );
}

function DeferredProductReviews({
  reviews,
  shopDomain,
  productId,
  productHandle,
  productTitle,
}) {
  const externalId = getExternalId(productId);

  return (
    <Suspense fallback={<div className="site-loading">Loading reviews...</div>}>
      <Await resolve={reviews}>
        {(resolvedReviews) => (
          <ProductReviews
            reviews={getProductReviews(resolvedReviews ?? [], externalId)}
            shopDomain={shopDomain}
            externalId={externalId}
            productHandle={productHandle}
            productTitle={productTitle}
          />
        )}
      </Await>
    </Suspense>
  );
}

function DeferredProductMerchandising({
  product,
  currentProductCard,
  bestSellers,
  recommendedProducts,
  ratings,
  judgeMeBadge,
}) {
  return (
    <Suspense fallback={null}>
      <Await resolve={Promise.all([bestSellers, recommendedProducts])}>
        {([resolvedBestSellers, resolvedRecommendedProducts]) => (
          <ProductMerchandising
            product={product}
            currentProductCard={currentProductCard}
            bestSellers={resolvedBestSellers}
            recommendedProducts={resolvedRecommendedProducts}
            ratings={ratings}
            judgeMeBadge={judgeMeBadge}
          />
        )}
      </Await>
    </Suspense>
  );
}

function ProductMerchandising({
  product,
  currentProductCard,
  bestSellers,
  recommendedProducts,
  ratings,
  judgeMeBadge,
}) {
  const allBestSellers = (bestSellers?.nodes ?? [])
    .filter((item) => item.handle !== product.handle)
    .slice(0, 8);
  const relatedProducts = (
    recommendedProducts?.length ? recommendedProducts : allBestSellers
  )
    .filter((item) => item.handle !== product.handle)
    .slice(0, 4);
  const relatedHandles = new Set(relatedProducts.map((item) => item.handle));
  const bestSellerProducts = allBestSellers
    .filter((item) => !relatedHandles.has(item.handle))
    .slice(0, 4);

  return (
    <div className="product-merchandising" aria-label="Product discovery">
      <ProductRecommendationRail
        eyebrow="Styled For You"
        title="Pairs well with this"
        description="Curated pieces that match the mood, fit, and everyday styling of the item you are viewing."
        products={relatedProducts}
        ratings={ratings}
        judgeMeBadge={judgeMeBadge}
        cta={{to: '/collections/all', label: 'Explore matches'}}
      />

      <RecentlyViewedProducts
        currentProduct={currentProductCard}
        ratings={ratings}
        judgeMeBadge={judgeMeBadge}
      />

      <ProductRecommendationRail
        eyebrow="Customer Favorites"
        title="Best-selling essentials"
        description="Most-loved pieces customers keep adding to their wardrobe. Balanced fits, clean colors, and everyday quality."
        products={bestSellerProducts}
        ratings={ratings}
        judgeMeBadge={judgeMeBadge}
        cta={{to: '/collections/best-sellers', label: 'Shop best sellers'}}
        tone="dark"
      />
    </div>
  );
}

function ProductRecommendationRail({
  eyebrow,
  title,
  description,
  products,
  ratings,
  judgeMeBadge,
  cta,
  tone = 'light',
}) {
  if (!products?.length) return null;
  const headingId = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-title`;

  return (
    <section
      className={`product-rail product-rail--${tone}`}
      aria-labelledby={headingId}
    >
      <div className="product-rail__header">
        <div>
          <span className="product-rail__eyebrow">{eyebrow}</span>
          <h2 id={headingId}>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {cta ? (
          <Link className="product-rail__link" to={cta.to} prefetch="intent">
            {cta.label}
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M3 7h8M8 4l3 3-3 3"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.3"
              />
            </svg>
          </Link>
        ) : null}
      </div>

      <div className="product-rail__grid">
        {products.map((item) => (
          <ProductItem
            key={item.id}
            product={item}
            ratings={ratings}
            judgeMeBadge={judgeMeBadge}
          />
        ))}
      </div>
    </section>
  );
}

function RecentlyViewedProducts({currentProduct, ratings, judgeMeBadge}) {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    if (!currentProduct?.id) return;

    const viewedProducts = getRecentlyViewedProducts()
      .filter((item) => item.id !== currentProduct.id)
      .slice(0, 4);

    setProducts(viewedProducts);
    saveRecentlyViewedProduct(currentProduct);
  }, [currentProduct]);

  return (
    <ProductRecommendationRail
      eyebrow="Your Browsing"
      title="Recently viewed"
      description="Pick up where you left off with products you checked moments ago."
      products={products}
      ratings={ratings}
      judgeMeBadge={judgeMeBadge}
      cta={{to: '/collections/all', label: 'Continue shopping'}}
    />
  );
}

function getProductCardData(product) {
  return {
    id: product.id,
    title: product.title,
    handle: product.handle,
    featuredImage: product.featuredImage,
    priceRange: product.priceRange,
    compareAtPriceRange: product.compareAtPriceRange,
    variants: {
      nodes: product.variants?.nodes ?? [],
    },
  };
}

function getRecentlyViewedProducts() {
  try {
    const raw = window.localStorage.getItem('baliza:recently-viewed');
    const products = raw ? JSON.parse(raw) : [];
    return Array.isArray(products) ? products : [];
  } catch {
    return [];
  }
}

function saveRecentlyViewedProduct(product) {
  try {
    const products = getRecentlyViewedProducts().filter(
      (item) => item.id !== product.id,
    );
    window.localStorage.setItem(
      'baliza:recently-viewed',
      JSON.stringify([product, ...products].slice(0, 8)),
    );
  } catch {
    // Storage can be unavailable in private browsing; discovery still works.
  }
}

const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ProductVariant on ProductVariant {
    availableForSale
    compareAtPrice {
      amount
      currencyCode
    }
    id
    image {
      __typename
      id
      url
      altText
      width
      height
    }
    price {
      amount
      currencyCode
    }
    product {
      title
      handle
    }
    selectedOptions {
      name
      value
    }
    sku
    title
    unitPrice {
      amount
      currencyCode
    }
  }
`;

const PRODUCT_FRAGMENT = `#graphql
  fragment Product on Product {
    id
    title
    vendor
    handle
    featuredImage {
      id
      url
      altText
      width
      height
    }
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    compareAtPriceRange {
      minVariantPrice {
        amount
        currencyCode
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
          amount
          currencyCode
        }
        compareAtPrice {
          amount
          currencyCode
        }
      }
    }
    descriptionHtml
    description
    media(first: 8) {
      nodes {
        __typename
        ... on MediaImage {
          id
          image {
            __typename
            id
            url
            altText
            width
            height
          }
        }
      }
    }
    encodedVariantExistence
    encodedVariantAvailability
    options {
      name
      optionValues {
        name
        firstSelectableVariant {
          ...ProductVariant
        }
        swatch {
          color
          image {
            previewImage {
              url
            }
          }
        }
      }
    }
    selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
      ...ProductVariant
    }
    adjacentVariants (selectedOptions: $selectedOptions) {
      ...ProductVariant
    }
    seo {
      description
      title
    }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
`;

const PRODUCT_QUERY = `#graphql
  query Product(
    $country: CountryCode
    $handle: String!
    $language: LanguageCode
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...Product
    }
  }
  ${PRODUCT_FRAGMENT}
`;

const PRODUCT_PAGE_CARD_FRAGMENT = `#graphql
  fragment ProductPageCard on Product {
    id
    title
    handle
    featuredImage {
      id
      url
      altText
      width
      height
    }
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    compareAtPriceRange {
      minVariantPrice {
        amount
        currencyCode
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
          amount
          currencyCode
        }
        compareAtPrice {
          amount
          currencyCode
        }
      }
    }
  }
`;

const PRODUCT_BEST_SELLERS_QUERY = `#graphql
  query ProductPageBestSellers(
    $country: CountryCode
    $first: Int!
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    products(first: $first, sortKey: BEST_SELLING) {
      nodes {
        ...ProductPageCard
      }
    }
  }
  ${PRODUCT_PAGE_CARD_FRAGMENT}
`;

const PRODUCT_RECOMMENDATIONS_QUERY = `#graphql
  query ProductPageRecommendations(
    $country: CountryCode
    $language: LanguageCode
    $productId: ID!
  ) @inContext(country: $country, language: $language) {
    productRecommendations(productId: $productId) {
      ...ProductPageCard
    }
  }
  ${PRODUCT_PAGE_CARD_FRAGMENT}
`;

/** @typedef {import('./+types/products.$handle').Route} Route */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */

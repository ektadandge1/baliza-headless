import {useLoaderData} from 'react-router';
import {
  getSelectedProductOptions,
  Analytics,
  useOptimisticVariant,
  getProductOptions,
  getAdjacentAndFirstAvailableVariants,
  useSelectedOptionInUrlParam,
} from '@shopify/hydrogen';
import {ProductPrice} from '~/components/ProductPrice';
import {ProductImage} from '~/components/ProductImage';
import {ProductForm} from '~/components/ProductForm';
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
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = await loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
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

  const [{product}] = await Promise.all([
    storefront.query(PRODUCT_QUERY, {
      variables: {handle, selectedOptions: getSelectedProductOptions(request)},
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

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
async function loadDeferredData({context}) {
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
    judgeMeReviews: await getAllReviews(env),
    judgeMeShopDomain: env.JUDGEME_SHOP_DOMAIN,
    judgeMeWidgetEnabled,
  };
}

export default function Product() {
  /** @type {LoaderReturnData} */
  const {product, judgeMeReviews, judgeMeShopDomain, judgeMeWidgetEnabled} =
    useLoaderData();

  const externalId = getExternalId(product.id);
  const reviews = getProductReviews(judgeMeReviews ?? [], externalId);
  const reviewTotal = reviews.length;
  const reviewAverage = reviewTotal
    ? reviews.reduce((sum, review) => sum + (review.rating || 0), 0) / reviewTotal
    : 0;

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

  const {title, description, descriptionHtml, vendor} = product;
  const productSummary = getProductSummary(description);

  return (
    <div className="product-page">
      <div className="product product--premium">
        <ProductImage image={selectedVariant?.image} />
        <section className="product-main" aria-label="Product information">
          <div className="product-main__eyebrow">
            <span className="product-main__badge">Product details</span>
            {vendor ? <span className="product-vendor">{vendor}</span> : null}
          </div>

          <h1>{title}</h1>

          <div className="product-main__meta">
            {reviewTotal ? (
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
            )}
            {selectedVariant?.sku ? (
              <small className="product-main__sku">SKU {selectedVariant.sku}</small>
            ) : null}
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

          {productSummary ? (
            <p className="product-main__summary">{productSummary}</p>
          ) : null}

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

          <div className="product-assurance-grid" aria-label="Shopping benefits">
            <span>Secure checkout</span>
            <span>Easy exchange</span>
            <span>Quality checked</span>
          </div>

          <details className="product-detail-drawer" open>
            <summary>Description</summary>
            <div
              className="product-description-prose"
              dangerouslySetInnerHTML={{__html: descriptionHtml}}
            />
          </details>

          <details className="product-detail-drawer">
            <summary>Size & Fit</summary>
            <p>
              Choose your usual size for a regular fit. Size availability updates
              instantly based on the selected variant.
            </p>
          </details>
        </section>
      </div>

      {judgeMeWidgetEnabled ? (
        <div id="product-reviews">
          <JudgeMeReviewWidget id={product.id} title={product.title} />
        </div>
      ) : (
        <div id="product-reviews">
          <ProductReviews
            reviews={reviews}
            shopDomain={judgeMeShopDomain}
            externalId={externalId}
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

function getProductSummary(description) {
  if (!description) return '';

  const text = description.replace(/\s+/g, ' ').trim();
  if (text.length <= 165) return text;

  return `${text.slice(0, 162).trimEnd()}...`;
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
    descriptionHtml
    description
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

/** @typedef {import('./+types/products.$handle').Route} Route */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */

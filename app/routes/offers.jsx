import {Link, useLoaderData} from 'react-router';
import {ProductItem} from '~/components/ProductItem';
import {buildRatingsMap, getAllReviews} from '~/lib/judgeMe';

export const meta = () => {
  return [{title: 'Offers | Baliza Tshirts'}];
};

/**
 * @param {Route.LoaderArgs} args
 */
export async function loader({context}) {
  const [productsData, allReviews] = await Promise.all([
    context.storefront.query(OFFERS_PRODUCTS_QUERY),
    getAllReviews(context.env),
  ]);

  const saleProducts = productsData.products.nodes.filter(hasSalePrice);

  return {
    discountCode: context.env.DISCOUNT_CODE || 'WELCOME10',
    judgeMeWidgetEnabled: Boolean(
      context.env.JUDGEME_SHOP_DOMAIN && context.env.JUDGEME_PUBLIC_TOKEN,
    ),
    ratings: buildRatingsMap(allReviews),
    saleProducts,
  };
}

export default function Offers() {
  const {discountCode, judgeMeWidgetEnabled, ratings, saleProducts} = useLoaderData();

  return (
    <main className="offers-page">
      <section className="offers-hero" aria-labelledby="offers-title">
        <div className="offers-hero__copy">
          <nav className="offers-breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span aria-hidden="true">/</span>
            <span>Offers</span>
          </nav>
          <span className="offers-eyebrow">Current Offers</span>
          <h1 id="offers-title">Bundles, Combos & Offers</h1>
          <p>
            Shop active Baliza promotions, value bundles, combo deals, marked-down
            styles, and limited-time savings across premium everyday T-shirts.
          </p>
        </div>
      </section>

      <section className="offers-panel" aria-label="Available offers">
        <OfferCard
          title="Bundle Deal"
          value="Buy 3 Save More"
          text="Build a weekly T-shirt rotation with better value on multi-piece orders."
          cta="Build Bundle"
          to="/collections/all"
        />
        <OfferCard
          title="Combo Pack"
          value="2 Tee Combo"
          text="Pair everyday solids with graphics for an easy wardrobe refresh."
          cta="Shop Combos"
          to="/collections/all"
        />
        <OfferCard
          title="Welcome Offer"
          value="10% OFF"
          text={`Use code ${discountCode} at checkout on your first order.`}
          cta="Shop Now"
          to="/collections/all"
        />
        <OfferCard
          title="Free Shipping"
          value="Over 150"
          text="Complimentary shipping automatically applies on eligible orders."
          cta="Explore"
          to="/collections/all"
        />
        <OfferCard
          title="Sale Styles"
          value="Live Now"
          text="Reduced prices on selected T-shirts while stock lasts."
          cta="View Sale"
          to="#sale-products"
        />
      </section>

      <section className="combo-offers" aria-labelledby="combo-offers-title">
        <div className="combo-offers__header">
          <span className="offers-eyebrow">Value Packs</span>
          <h2 id="combo-offers-title">Bundles & Combos</h2>
          <p>Curated ways to save when you buy more than one Baliza essential.</p>
        </div>

        <div className="combo-offers__grid">
          <ComboCard
            title="Essentials Bundle"
            items="3 premium tees"
            text="Choose clean everyday colors for daily wear."
            to="/collections/essentials"
          />
          <ComboCard
            title="Graphic Combo"
            items="2 statement tees"
            text="Mix artwork, prints, and seasonal graphics."
            to="/collections/graphic-tees"
          />
          <ComboCard
            title="Polo + Tee Set"
            items="Smart casual pair"
            text="A polished polo with a relaxed everyday T-shirt."
            to="/collections/all"
          />
          <ComboCard
            title="Family Pack"
            items="Multi-size order"
            text="Add multiple sizes and colors for better cart value."
            to="/collections/all"
          />
        </div>
      </section>

      <section id="sale-products" className="offers-products" aria-labelledby="sale-products-title">
        <div className="offers-products__header">
          <div>
            <span className="offers-eyebrow">Markdowns</span>
            <h2 id="sale-products-title">Sale Products</h2>
          </div>
          <Link to="/collections/all" className="offers-products__link">
            View All
          </Link>
        </div>

        {saleProducts.length ? (
          <div className="offers-products__grid">
            {saleProducts.map((product) => (
              <ProductItem
                key={product.id}
                product={product}
                ratings={ratings}
                judgeMeBadge={judgeMeWidgetEnabled}
              />
            ))}
          </div>
        ) : (
          <div className="offers-empty">
            <h3>No sale products right now</h3>
            <p>Check the full collection for the latest drops and active checkout offers.</p>
            <Link to="/collections/all">Shop Collection</Link>
          </div>
        )}
      </section>
    </main>
  );
}

function OfferCard({title, value, text, cta, to}) {
  return (
    <article className="offer-card">
      <span>{title}</span>
      <h2>{value}</h2>
      <p>{text}</p>
      <Link to={to}>{cta}</Link>
    </article>
  );
}

function ComboCard({title, items, text, to}) {
  return (
    <article className="combo-card">
      <div>
        <span>{items}</span>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
      <Link to={to}>Shop Pack</Link>
    </article>
  );
}

function hasSalePrice(product) {
  return product.variants.nodes.some((variant) => {
    const price = Number(variant.price?.amount || 0);
    const compareAt = Number(variant.compareAtPrice?.amount || 0);
    return compareAt > price;
  });
}

const OFFERS_PRODUCTS_QUERY = `#graphql
  fragment OffersProduct on Product {
    id
    title
    handle
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
    featuredImage {
      id
      url
      altText
      width
      height
    }
  }
  query OffersProducts($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    products(first: 24, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...OffersProduct
      }
    }
  }
`;

/** @typedef {import('./+types/offers').Route} Route */

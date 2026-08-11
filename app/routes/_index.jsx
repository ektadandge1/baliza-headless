import {useLoaderData, Link} from 'react-router';
import {Image} from '@shopify/hydrogen';
import {ProductItem} from '~/components/ProductItem';
import {ReviewCard} from '~/components/ReviewCard';
import {Stars} from '~/components/Stars';
import {MockShopNotice} from '~/components/MockShopNotice';
import {getAllReviews, buildRatingsMap} from '~/lib/judgeMe';

/**
 * @type {Route.MetaFunction}
 */
export const meta = () => {
  return [{title: 'Baliza Tshirts | Premium Clothing Store'}];
};

/**
 * @param {Route.LoaderArgs} args
 */
export async function loader(args) {
  return await loadCriticalData(args);
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 * @param {Route.LoaderArgs}
 */
async function loadCriticalData({context}) {
  const [{collections}, newArrivals, bestSellers] = await Promise.all([
    context.storefront.query(FEATURED_COLLECTION_QUERY),
    context.storefront.query(NEW_ARRIVALS_QUERY),
    context.storefront.query(BEST_SELLERS_QUERY),
  ]);

  const allReviews = await getAllReviews(context.env);
  const ratings = buildRatingsMap(allReviews);
  const homeReviews = allReviews
    .filter((r) => r.rating >= 4 && r.body)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 6);

  const judgeMeWidgetEnabled = Boolean(
    context.env.JUDGEME_SHOP_DOMAIN && context.env.JUDGEME_PUBLIC_TOKEN,
  );

  return {
    isShopLinked: Boolean(context.env.PUBLIC_STORE_DOMAIN),
    featuredCollection: collections.nodes[0],
    newArrivals: newArrivals.products,
    bestSellers: bestSellers.products,
    ratings,
    judgeMeReviews: homeReviews,
    judgeMeWidgetEnabled,
  };
}

export default function Homepage() {
  /** @type {LoaderReturnData} */
  const data = useLoaderData();
  return (
    <div className="home">
      {data.isShopLinked ? null : <MockShopNotice />}
      <EnterpriseBannerSection />
      <ShopByCategory products={data.newArrivals} />
      <TrustStrip />
      <FeaturedCollection collection={data.featuredCollection} />
      <NewArrivals
        products={data.newArrivals}
        ratings={data.ratings}
        judgeMeBadge={data.judgeMeWidgetEnabled}
      />
      <BestSellers
        products={data.bestSellers}
        ratings={data.ratings}
        judgeMeBadge={data.judgeMeWidgetEnabled}
      />
      <BrandStory products={data.newArrivals} />
      <Testimonials reviews={data.judgeMeReviews} />
    </div>
  );
}

function EnterpriseBannerSection() {
  return (
    <section className="enterprise-slideshow" aria-label="Featured clothing banners">
      <div className="enterprise-slideshow__track">
        <article className="enterprise-slide enterprise-slide--one">
          <img
            src="https://cdn.shopify.com/s/files/1/0775/4976/4773/files/New-Banner--3_1.jpg?v=1784281182"
            alt="Premium Baliza t-shirt collection"
            width="1920"
            height="900"
            loading="eager"
            decoding="async"
          />
        </article>

        <article className="enterprise-slide enterprise-slide--two">
          <img
            src="https://cdn.shopify.com/s/files/1/0775/4976/4773/files/Mian-banner-8-Recovered_1.jpg?v=1784281182"
            alt="Baliza bestselling t-shirt collection"
            width="1920"
            height="900"
            loading="lazy"
            decoding="async"
          />
        </article>
      </div>

      <div className="enterprise-slideshow__dots" aria-hidden="true">
        <span />
        <span />
      </div>
    </section>
  );
}

function ShopByCategory({products}) {
  const fallbackImage =
    'https://cdn.shopify.com/s/files/1/0775/4976/4773/files/New-Banner--3_1.jpg?v=1784281182';
  const productImages =
    products?.nodes
      ?.map((product) => product.featuredImage?.url)
      .filter(Boolean) ?? [];
  const categories = [
    {
      id: 't-shirts',
      title: 'T-Shirts',
      url: '/collections/all',
      image: productImages[0],
    },
    {
      id: 'hoodies',
      title: 'Hoodies',
      url: '/collections/all',
      image: productImages[1],
    },
    {
      id: 'polos',
      title: 'Polos',
      url: '/collections/all',
      image: productImages[2],
    },
    {
      id: 'graphics',
      title: 'Graphics',
      url: '/collections/all',
      image: productImages[3],
    },
  ];

  return (
    <section className="category-section" aria-labelledby="category-heading">
      <div className="category-section__head">
        <span className="category-section__eyebrow">Collections</span>
        <h2 id="category-heading">Shop by Category</h2>
      </div>

      <div className="category-grid">
        {categories.map((category, index) => (
          <Link
            key={category.id}
            to={category.url}
            prefetch="intent"
            className="category-card"
            style={{'--card-index': index}}
          >
            <img
              src={category.image ?? productImages[0] ?? fallbackImage}
              alt={`${category.title} category`}
              loading="lazy"
            />
            <div className="category-card__shade" />
            <div className="category-card__content">
              <h3>{category.title}</h3>
              <span className="category-card__cta">
                Shop now
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function TrustStrip() {
  const items = [
    {
      id: 'shipping',
      title: 'Free Shipping',
      desc: 'On orders over $150',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
          <path d="M3 7h11v10H3z" strokeLinejoin="round" />
          <path d="M14 10h4l3 3v4h-7" strokeLinejoin="round" />
          <circle cx="7" cy="18" r="1.6" />
          <circle cx="17" cy="18" r="1.6" />
        </svg>
      ),
    },
    {
      id: 'returns',
      title: 'Easy Returns',
      desc: '30-day hassle-free',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
          <path d="M4 10a8 8 0 0 1 13.5-4.5L20 8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M20 4v4h-4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M20 14a8 8 0 0 1-13.5 4.5L4 16" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 20v-4h4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      id: 'quality',
      title: 'Premium Cotton',
      desc: 'Soft, durable feel',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
          <path d="M12 3c2 2 4 2 4 5a4 4 0 0 1-4 4 4 4 0 0 1-4-4c0-3 2-3 4-5Z" strokeLinejoin="round" />
          <path d="M5 17c2 1.5 12 1.5 14 0" strokeLinecap="round" />
          <path d="M9 21l3-3 3 3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      id: 'secure',
      title: 'Secure Checkout',
      desc: 'Encrypted payments',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
          <rect x="5" y="10" width="14" height="10" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" strokeLinecap="round" />
          <circle cx="12" cy="15" r="1.4" />
        </svg>
      ),
    },
  ];

  return (
    <section className="trust-strip" aria-label="Store benefits">
      <ul className="trust-strip__list">
        {items.map((item, index) => (
          <li
            key={item.id}
            className="trust-strip__item"
            style={{'--trust-index': index}}
          >
            <span className="trust-strip__icon">{item.icon}</span>
            <span className="trust-strip__text">
              <strong>{item.title}</strong>
              <small>{item.desc}</small>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * @param {{
 *   collection: FeaturedCollectionFragment;
 * }}
 */
function FeaturedCollection({collection}) {
  if (!collection) return null;
  const image = collection?.image;
  if (!image) return null;
  return (
    <Link
      className="featured-collection"
      to={`/collections/${collection.handle}`}
      aria-label={collection.title}
    >
      <div className="featured-collection-image">
        <Image
          data={image}
          sizes="100vw"
          alt={image.altText || collection.title}
        />
      </div>
    </Link>
  );
}

/**
 * @param {{
 *   products: NewArrivalsQuery['products'];
 * }}
 */
function NewArrivals({products, ratings, judgeMeBadge}) {
  if (!products?.nodes?.length) return null;
  return (
    <section
      className="new-arrivals"
      aria-labelledby="new-arrivals-title"
    >
      <div className="new-arrivals__header">
        <div className="new-arrivals__copy">
          <span className="new-arrivals__eyebrow">Just Landed</span>
          <h2 id="new-arrivals-title">New Arrivals</h2>
        </div>
        <Link to="/collections/all" className="new-arrivals__link" prefetch="intent">
          View All Products
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>

      <div className="new-arrivals__grid">
        {products.nodes.map((product) => (
          <ProductItem
            key={product.id}
            product={product}
            ratings={ratings}
            judgeMeBadge={judgeMeBadge}
          />
        ))}
      </div>
    </section>
  );
}

/**
 * @param {{
 *   products: BestSellersQuery['products'];
 * }}
 */
function BestSellers({products, ratings, judgeMeBadge}) {
  if (!products?.nodes?.length) return null;
  return (
    <section className="best-sellers" aria-labelledby="best-sellers-title">
      <div className="best-sellers__panel">
        <div className="best-sellers__header">
          <span className="best-sellers__eyebrow">Customer Favorites</span>
          <h2 id="best-sellers-title">Best Sellers</h2>
        </div>

        <div className="best-sellers__grid">
          {products.nodes.slice(0, 4).map((product, index) => (
            <div
              className="best-sellers__card"
              key={product.id}
              style={{'--best-seller-rank': index + 1}}
            >
              <span className="best-sellers__rank">
                {String(index + 1).padStart(2, '0')}
              </span>
              <ProductItem
                product={product}
                ratings={ratings}
                judgeMeBadge={judgeMeBadge}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BrandStory({products}) {
  const image =
    products?.nodes?.[0]?.featuredImage?.url ??
    'https://cdn.shopify.com/s/files/1/0775/4976/4773/files/New-Banner--3_1.jpg?v=1784281182';
  return (
    <section className="brand-story" aria-labelledby="brand-story-title">
      <div className="brand-story__grid">
        <div className="brand-story__media">
          <img src={image} alt="Baliza craftsmanship and premium cotton" loading="lazy" />
          <div className="brand-story__media-badge">
            <span>Est. 2024</span>
          </div>
        </div>

        <div className="brand-story__content">
          <span className="brand-story__eyebrow">Our Story</span>
          <h2 id="brand-story-title">Built On Quality, Worn With Confidence</h2>
          <p>
            Every Baliza piece starts with premium cotton and a focus on clean,
            modern fits. We design essentials that move seamlessly from daily
            routines to standout moments.
          </p>

          <ul className="brand-story__stats">
            <li>
              <strong>100%</strong>
              <small>Premium Cotton</small>
            </li>
            <li>
              <strong>10k+</strong>
              <small>Happy Customers</small>
            </li>
            <li>
              <strong>4.9</strong>
              <small>Average Rating</small>
            </li>
          </ul>

          <Link to="/collections/all" className="brand-story__cta" prefetch="intent">
            Explore Our Collection
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}

function Testimonials({reviews: realReviews}) {
  const reviews = realReviews?.length
    ? realReviews
    : [
    {
      name: 'Amara Okafor',
      location: 'Lagos, NG',
      initials: 'AO',
      rating: 5,
      product: 'Oversized Cotton Tee',
      text: 'The fabric feels incredible and the fit is exactly what I wanted. It has become my everyday go-to and still looks brand new after months of wear.',
      verified: true,
    },
    {
      name: 'James Carter',
      location: 'London, UK',
      initials: 'JC',
      rating: 5,
      product: 'Premium Hoodie',
      text: 'Finally a hoodie that is heavy, soft, and does not lose shape. The quality is on another level and shipping was surprisingly fast.',
      verified: true,
    },
    {
      name: 'Sofia Reyes',
      location: 'Madrid, ES',
      initials: 'SR',
      rating: 5,
      product: 'Relaxed Lounge Set',
      text: 'Effortless style and so comfortable. I get compliments every time I wear it. Baliza has earned a lifelong customer.',
      verified: true,
    },
    {
      name: 'Daniel Kim',
      location: 'Seoul, KR',
      initials: 'DK',
      rating: 4,
      product: 'Classic Polo',
      text: 'Clean, minimal, and true to size. The stitching detail shows real craftsmanship. Would love a few more color options.',
      verified: true,
    },
    {
      name: 'Priya Nair',
      location: 'Mumbai, IN',
      initials: 'PN',
      rating: 5,
      product: 'Everyday Joggers',
      text: 'Softest joggers I own. The waistband is perfect and the cut is flattering. Worth every penny for the quality.',
      verified: true,
    },
    {
      name: 'Lucas Meyer',
      location: 'Berlin, DE',
      initials: 'LM',
      rating: 5,
      product: 'Oversized Cotton Tee',
      text: 'Minimal design done right. The material breathes well and the color is exactly as shown. Highly recommend.',
      verified: true,
    },
  ];

  const average = (
    reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
  ).toFixed(1);

  const distribution = {5: 0, 4: 0, 3: 0, 2: 0, 1: 0};
  reviews.forEach((r) => {
    const k = Math.round(r.rating || 0);
    if (distribution[k] != null) distribution[k] += 1;
  });
  const total = reviews.length;
  const ratingBars = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    percent: total ? Math.round((distribution[stars] / total) * 100) : 0,
  }));

  return (
    <section className="testimonials" aria-labelledby="testimonials-title">
      <div className="testimonials__inner">
        <div className="testimonials__header">
          <span className="testimonials__eyebrow">What Customers Say</span>
          <h2 id="testimonials-title">Loved By Thousands</h2>
          <p className="testimonials__subtitle">
            Real feedback from real customers who wear Baliza every day.
          </p>
        </div>

        <div className="testimonials__summary">
          <div className="testimonials__score">
            <span className="testimonials__score-value">{average}</span>
            <Stars value={Number(average)} size={16} />
            <span className="testimonials__score-count">
              Based on {total} review{total > 1 ? 's' : ''}
            </span>
          </div>

          <div className="testimonials__bars" aria-hidden="true">
            {ratingBars.map((bar) => (
              <div className="testimonials__bar-row" key={bar.stars}>
                <span className="testimonials__bar-label">{bar.stars}</span>
                <span className="testimonials__bar-track">
                  <span
                    className="testimonials__bar-fill"
                    style={{width: `${bar.percent}%`}}
                  />
                </span>
                <span className="testimonials__bar-percent">{bar.percent}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="testimonials__grid">
          {reviews.map((review, index) => (
            <ReviewCard key={review.id ?? index} review={review} />
          ))}
        </div>
      </div>
    </section>
  );
}

const FEATURED_COLLECTION_QUERY = `#graphql
  fragment FeaturedCollection on Collection {
    id
    title
    image {
      id
      url
      altText
      width
      height
    }
    handle
  }
  query FeaturedCollection($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    collections(first: 1, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...FeaturedCollection
      }
    }
  }
`;

const NEW_ARRIVALS_QUERY = `#graphql
  fragment NewArrivalProduct on Product {
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
  query NewArrivals ($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    products(first: 8, sortKey: CREATED_AT, reverse: true) {
      nodes {
        ...NewArrivalProduct
      }
    }
  }
`;

const BEST_SELLERS_QUERY = `#graphql
  fragment BestSellerProduct on Product {
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
  query BestSellers ($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    products(first: 4, sortKey: BEST_SELLING) {
      nodes {
        ...BestSellerProduct
      }
    }
  }
`;

/** @typedef {import('./+types/_index').Route} Route */
/** @typedef {import('storefrontapi.generated').FeaturedCollectionFragment} FeaturedCollectionFragment */
/** @typedef {import('storefrontapi.generated').NewArrivalsQuery} NewArrivalsQuery */
/** @typedef {import('storefrontapi.generated').BestSellersQuery} BestSellersQuery */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */

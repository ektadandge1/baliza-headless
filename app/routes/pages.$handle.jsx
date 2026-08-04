import {Link, useLoaderData} from 'react-router';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';

/**
 * @type {Route.MetaFunction}
 */
export const meta = ({data}) => {
  return [{title: `Baliza | ${data?.page.title ?? ''}`}];
};

/**
 * @param {Route.LoaderArgs} args
 */
export async function loader(args) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 * @param {Route.LoaderArgs}
 */
async function loadCriticalData({context, request, params}) {
  if (!params.handle) {
    throw new Error('Missing page handle');
  }

  const isAboutPage = params.handle === 'about' || params.handle === 'about-us';

  let {page} = await context.storefront.query(PAGE_QUERY, {
    variables: {
      handle: params.handle,
    },
  });

  if (!page) {
    page = FALLBACK_PAGES[params.handle];
  }

  if (!page) throw new Response('Not Found', {status: 404});

  if (page.id)
    redirectIfHandleIsLocalized(request, {handle: params.handle, data: page});

  const aboutProducts = isAboutPage
    ? await context.storefront
        .query(ABOUT_PRODUCTS_QUERY)
        .then(({products}) => products)
        .catch(() => null)
    : null;

  return {
    page,
    aboutProducts,
  };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 * @param {Route.LoaderArgs}
 */
function loadDeferredData() {
  return {};
}

export default function Page() {
  /** @type {LoaderReturnData} */
  const {page, aboutProducts} = useLoaderData();

  if (page.handle === 'about' || page.handle === 'about-us') {
    return <AboutPage products={aboutProducts} />;
  }

  return (
    <div className="page">
      <header>
        <h1>{page.title}</h1>
      </header>
      <main dangerouslySetInnerHTML={{__html: page.body}} />
    </div>
  );
}

function AboutPage({products}) {
  const fallbackProducts = [
    {
      id: 'fallback-statement-tee',
      title: 'Statement Graphic Tee',
      src: 'https://cdn.shopify.com/s/files/1/0775/4976/4773/files/New-Banner--3_1.jpg?v=1784281182',
    },
    {
      id: 'fallback-premium-fit',
      title: 'Premium Everyday Fit',
      src: 'https://cdn.shopify.com/s/files/1/0775/4976/4773/files/Mian-banner-8-Recovered_1.jpg?v=1784281182',
    },
  ];
  const productCards =
    products?.nodes
      ?.map((product) => ({
        id: product.id,
        title: product.title,
        src: product.featuredImage?.url,
        alt: product.featuredImage?.altText || product.title,
      }))
      .filter((product) => product.src) ?? [];
  const showcaseProducts = [...productCards, ...fallbackProducts].slice(0, 4);

  const values = [
    {
      title: 'Premium Feel',
      text: 'Soft fabrics, clean structure, and an easy weight made for daily wear.',
    },
    {
      title: 'Sharp Simplicity',
      text: 'Minimal pieces with balanced fits, quiet details, and no unnecessary noise.',
    },
    {
      title: 'Made To Repeat',
      text: 'Reliable construction and versatile styling built for regular rotation.',
    },
  ];

  return (
    <div className="about-page">
      <section className="about-hero" aria-labelledby="about-title">
        <div className="about-hero__copy">
          <span className="about-eyebrow">About Baliza</span>
          <h1 id="about-title">Everyday essentials, made clean.</h1>
          <p>
            Baliza designs premium clothing with a minimal point of view: easy
            comfort, refined fits, and product details that feel intentional
            without looking loud.
          </p>
          <div className="about-hero__actions">
            <Link
              to="/collections/all"
              prefetch="intent"
              className="about-btn about-btn--dark"
            >
              Shop Collection
            </Link>
            <Link
              to="/pages/contact"
              prefetch="intent"
              className="about-btn about-btn--light"
            >
              Contact Us
            </Link>
          </div>
        </div>

        <div
          className="about-hero__visual"
          aria-label="Baliza product showcase"
        >
          {showcaseProducts.map((product, index) => (
            <article
              className={`about-product-card about-product-card--${index + 1}`}
              key={product.id}
            >
              <img
                src={product.src}
                alt={product.alt ?? product.title}
                loading={index === 0 ? 'eager' : 'lazy'}
              />
              <span>{product.title}</span>
            </article>
          ))}
          <div className="about-hero__badge">
            <strong>Clean Fits</strong>
            <span>Premium daily wear</span>
          </div>
        </div>
      </section>

      <section className="about-values" aria-labelledby="about-values-title">
        <div className="about-section-head">
          <span className="about-eyebrow">Our Standard</span>
          <h2 id="about-values-title">Made simple. Made better.</h2>
        </div>

        <div className="about-values__grid">
          {values.map((value, index) => (
            <article className="about-value-card" key={value.title}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <h3>{value.title}</h3>
              <p>{value.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-editorial" aria-label="Baliza brand promise">
        <div className="about-editorial__panel">
          <span>Quiet confidence</span>
          <p>
            The best pieces do not need to shout. They work because the fit,
            fabric, and finish feel right every time you wear them.
          </p>
        </div>
        <div className="about-editorial__content">
          <span className="about-eyebrow">Why We Exist</span>
          <h2>Built for wardrobes that prefer clarity.</h2>
          <p>
            We focus on fewer distractions, better essentials, and clothing that
            moves naturally between work, weekends, travel, and slow days.
          </p>
          <ul className="about-checklist">
            <li>Premium feel without loud branding</li>
            <li>Versatile pieces for daily rotation</li>
            <li>Thoughtful details, honest comfort</li>
          </ul>
        </div>
      </section>

      <section className="about-closing" aria-labelledby="about-closing-title">
        <span className="about-eyebrow">The Baliza Way</span>
        <h2 id="about-closing-title">Simple pieces. Better presence.</h2>
        <p>
          Start with clean basics, add personality when it matters, and keep the
          quality consistent. That is the Baliza promise.
        </p>
      </section>
    </div>
  );
}

const PAGE_QUERY = `#graphql
  query Page(
    $language: LanguageCode,
    $country: CountryCode,
    $handle: String!
  )
  @inContext(language: $language, country: $country) {
    page(handle: $handle) {
      handle
      id
      title
      body
      seo {
        description
        title
      }
    }
  }
`;

const ABOUT_PRODUCTS_QUERY = `#graphql
  query AboutProducts($language: LanguageCode, $country: CountryCode)
  @inContext(language: $language, country: $country) {
    products(first: 4, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        id
        title
        handle
        featuredImage {
          url
          altText
          width
          height
        }
      }
    }
  }
`;

const FALLBACK_PAGES = {
  about: {
    handle: 'about',
    title: 'About Baliza',
    body: `
      <section class="page-fallback">
        <p>Baliza creates premium everyday essentials with a focus on clean design, comfort, and dependable quality.</p>
        <p>Our pieces are built for daily wear: soft fabrics, modern fits, and details that feel considered without being loud.</p>
      </section>
    `,
  },
  contact: {
    handle: 'contact',
    title: 'Contact Us',
    body: `
      <section class="page-fallback">
        <p>Need help with an order, sizing, shipping, or returns? We are here to help.</p>
        <p>Email us at <a href="mailto:support@baliza.in">support@baliza.in</a> and our team will get back to you as soon as possible.</p>
      </section>
    `,
  },
};

/** @typedef {import('./+types/pages.$handle').Route} Route */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */

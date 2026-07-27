import {Link, useLoaderData} from 'react-router';
import {Image, getPaginationVariables} from '@shopify/hydrogen';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';

/**
 * @type {Route.MetaFunction}
 */
export const meta = () => {
  return [{title: 'Journal | Baliza'}];
};

/**
 * @param {Route.LoaderArgs} args
 */
export async function loader({context, request}) {
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 10,
  });

  const [{blogs}] = await Promise.all([
    context.storefront.query(BLOGS_QUERY, {
      variables: {
        ...paginationVariables,
      },
    }),
  ]);

  return {blogs};
}

export default function Blogs() {
  const {blogs} = useLoaderData();

  return (
    <section className="blogs-page">
      <header className="blogs-hero">
        <span className="blogs-hero__eyebrow">Baliza</span>
        <h1>Journal</h1>
        <p>
          Style guides, care tips, trend reports, and the stories behind our
          collections.
        </p>
      </header>

      <div className="blogs-grid">
        <PaginatedResourceSection connection={blogs}>
          {({node: blog, index}) => (
            <Link
              className="blog-card"
              key={blog.handle}
              prefetch="intent"
              to={`/blogs/${blog.handle}`}
            >
              {blog.articles.nodes[0]?.image && (
                <div className="blog-card__image">
                  <Image
                    alt={blog.articles.nodes[0].image.altText || blog.title}
                    aspectRatio="3/2"
                    data={blog.articles.nodes[0].image}
                    loading={index < 2 ? 'eager' : 'lazy'}
                    sizes="(min-width: 768px) 50vw, 100vw"
                  />
                </div>
              )}
              <div className="blog-card__body">
                <span className="blog-card__label">{blog.title}</span>
                <h2 className="blog-card__title">
                  {blog.articles.nodes[0]?.title || blog.title}
                </h2>
                <p className="blog-card__excerpt">
                  {blog.articles.nodes[0]
                    ? stripHtml(blog.articles.nodes[0].contentHtml).slice(
                        0,
                        140,
                      ) + '...'
                    : 'Explore our latest articles.'}
                </p>
                <span className="blog-card__link">
                  Read more
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </Link>
          )}
        </PaginatedResourceSection>
      </div>
    </section>
  );
}

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

const BLOGS_QUERY = `#graphql
  query Blogs(
    $country: CountryCode
    $endCursor: String
    $first: Int
    $language: LanguageCode
    $last: Int
    $startCursor: String
  ) @inContext(country: $country, language: $language) {
    blogs(
      first: $first,
      last: $last,
      before: $startCursor,
      after: $endCursor
    ) {
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      nodes {
        title
        handle
        seo {
          title
          description
        }
        articles(first: 1) {
          nodes {
            title
            handle
            contentHtml
            image {
              id
              altText
              url
              width
              height
            }
          }
        }
      }
    }
  }
`;

/** @typedef {import('./+types/blogs._index').Route} Route */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */

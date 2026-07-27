import {Link, useLoaderData} from 'react-router';
import {Image, getPaginationVariables} from '@shopify/hydrogen';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';

/**
 * @type {Route.MetaFunction}
 */
export const meta = ({data}) => {
  return [{title: `${data?.blog.title ?? ''} | Baliza Journal`}];
};

/**
 * @param {Route.LoaderArgs} args
 */
export async function loader({context, request, params}) {
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 6,
  });

  if (!params.blogHandle) {
    throw new Response('Blog not found', {status: 404});
  }

  let {blog} = await context.storefront.query(BLOGS_QUERY, {
    variables: {
      blogHandle: params.blogHandle,
      ...paginationVariables,
    },
  });

  if (!blog?.articles && params.blogHandle === 'journal') {
    blog = FALLBACK_JOURNAL;
  }

  if (!blog?.articles) throw new Response('Not found', {status: 404});

  if (blog.id) {
    redirectIfHandleIsLocalized(request, {
      handle: params.blogHandle,
      data: blog,
    });
  }

  return {blog};
}

export default function Blog() {
  const {blog} = useLoaderData();
  const {articles} = blog;

  return (
    <section className="blog-articles-page">
      <nav className="blog-articles-page__crumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span aria-hidden="true">/</span>
        <Link to="/blogs">Journal</Link>
        <span aria-hidden="true">/</span>
        <span>{blog.title}</span>
      </nav>

      <header className="blog-articles-hero">
        <h1>{blog.title}</h1>
        <p className="blog-articles-hero__sub">
          Explore our latest thoughts on style, quality, and the details that
          make Baliza different.
        </p>
      </header>

      {articles.nodes.length ? (
        <div className="blog-articles-grid">
          <PaginatedResourceSection connection={articles}>
            {({node: article, index}) => (
              <ArticleCard
                article={article}
                blogHandle={blog.handle}
                loading={index < 3 ? 'eager' : 'lazy'}
              />
            )}
          </PaginatedResourceSection>
        </div>
      ) : (
        <div className="blog-empty-state">
          <h2>Journal coming soon</h2>
          <p>Style guides, care tips, and brand stories will appear here once the Shopify blog is published.</p>
          <Link to="/collections/all">Shop the collection</Link>
        </div>
      )}
    </section>
  );
}

function ArticleCard({article, blogHandle, loading}) {
  const publishedAt = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(article.publishedAt));

  const excerpt = stripHtml(article.contentHtml).slice(0, 160) + '...';
  const readTime = Math.max(
    1,
    Math.ceil(stripHtml(article.contentHtml).split(/\s+/).length / 200),
  );

  return (
    <Link
      className="article-card"
      to={`/blogs/${blogHandle}/${article.handle}`}
      prefetch="intent"
    >
      {article.image && (
        <div className="article-card__image">
          <Image
            alt={article.image.altText || article.title}
            aspectRatio="3/2"
            data={article.image}
            loading={loading}
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
          />
        </div>
      )}
      <div className="article-card__body">
        <div className="article-card__meta">
          <time dateTime={article.publishedAt}>{publishedAt}</time>
          <span aria-hidden="true">&middot;</span>
          <span>{readTime} min read</span>
        </div>
        <h2 className="article-card__title">{article.title}</h2>
        <p className="article-card__excerpt">{excerpt}</p>
        <span className="article-card__link">
          Read article
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
  );
}

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

const BLOGS_QUERY = `#graphql
  query Blog(
    $language: LanguageCode
    $blogHandle: String!
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
  ) @inContext(language: $language) {
    blog(handle: $blogHandle) {
      title
      handle
      seo {
        title
        description
      }
      articles(
        first: $first,
        last: $last,
        before: $startCursor,
        after: $endCursor
      ) {
        nodes {
          ...ArticleItem
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
  fragment ArticleItem on Article {
    author: authorV2 {
      name
    }
    contentHtml
    handle
    id
    image {
      id
      altText
      url
      width
      height
    }
    publishedAt
    title
    blog {
      handle
    }
  }
`;

const FALLBACK_JOURNAL = {
  title: 'Journal',
  handle: 'journal',
  articles: {
    nodes: [],
    pageInfo: {
      hasPreviousPage: false,
      hasNextPage: false,
      endCursor: null,
      startCursor: null,
    },
  },
};

/** @typedef {import('./+types/blogs.$blogHandle._index').Route} Route */
/** @typedef {import('storefrontapi.generated').ArticleItemFragment} ArticleItemFragment */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */

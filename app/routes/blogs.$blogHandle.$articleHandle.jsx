import {Link, useLoaderData} from 'react-router';
import {Image} from '@shopify/hydrogen';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';

/**
 * @type {Route.MetaFunction}
 */
export const meta = ({data}) => {
  const article = data?.article;
  return [
    {title: `${article?.title ?? 'Article'} | Baliza Journal`},
    article?.seo?.description
      ? {name: 'description', content: article.seo.description}
      : {},
  ];
};

/**
 * @param {Route.LoaderArgs} args
 */
export async function loader({context, request, params}) {
  const {blogHandle, articleHandle} = params;

  if (!articleHandle || !blogHandle) {
    throw new Response('Not found', {status: 404});
  }

  const [{blog}] = await Promise.all([
    context.storefront.query(ARTICLE_QUERY, {
      variables: {blogHandle, articleHandle},
    }),
  ]);

  if (!blog?.articleByHandle) {
    throw new Response(null, {status: 404});
  }

  redirectIfHandleIsLocalized(
    request,
    {handle: articleHandle, data: blog.articleByHandle},
    {handle: blogHandle, data: blog},
  );

  const article = blog.articleByHandle;

  // Fetch related articles (same blog, excluding current)
  const [{articles: relatedArticles}] = await Promise.all([
    context.storefront.query(RELATED_ARTICLES_QUERY, {
      variables: {
        blogHandle,
        first: 4,
      },
    }),
  ]);

  const related = (relatedArticles?.nodes ?? []).filter(
    (a) => a.handle !== articleHandle,
  ).slice(0, 3);

  return {article, related, blogHandle};
}

export default function Article() {
  const {article, related, blogHandle} = useLoaderData();
  const {title, image, contentHtml, author} = article;

  const publishedDate = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(article.publishedAt));

  const wordCount = stripHtml(contentHtml).split(/\s+/).length;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  const shareUrl =
    typeof window !== 'undefined' ? window.location.href : '';
  const shareText = encodeURIComponent(title);

  return (
    <section className="article-page">
      <nav className="article-page__crumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span aria-hidden="true">/</span>
        <Link to="/blogs">Journal</Link>
        <span aria-hidden="true">/</span>
        <Link to={`/blogs/${blogHandle}`}>{blogHandle}</Link>
        <span aria-hidden="true">/</span>
        <span>{title}</span>
      </nav>

      <header className="article-hero">
        <div className="article-hero__meta">
          <time dateTime={article.publishedAt}>{publishedDate}</time>
          <span aria-hidden="true">&middot;</span>
          <span>{readTime} min read</span>
          {author?.name && (
            <>
              <span aria-hidden="true">&middot;</span>
              <span>By {author.name}</span>
            </>
          )}
        </div>
        <h1>{title}</h1>
      </header>

      {image && (
        <div className="article-hero-image">
          <Image
            data={image}
            sizes="(min-width: 1024px) 900px, (min-width: 768px) 80vw, 100vw"
            loading="eager"
          />
        </div>
      )}

      <article
        className="article-content"
        dangerouslySetInnerHTML={{__html: contentHtml}}
      />

      <footer className="article-footer">
        <div className="article-share">
          <span className="article-share__label">Share this article</span>
          <div className="article-share__buttons">
            <a
              href={`https://wa.me/?text=${shareText}%20${shareUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="article-share__btn"
              aria-label="Share on WhatsApp"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </a>
            <a
              href={`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="article-share__btn"
              aria-label="Share on Twitter"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <button
              type="button"
              className="article-share__btn"
              aria-label="Copy link"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
              }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </button>
          </div>
        </div>

        <Link to={`/blogs/${blogHandle}`} className="btn-add">
          Back to {blogHandle}
        </Link>
      </footer>

      {related.length > 0 && (
        <aside className="article-related">
          <h2>Continue reading</h2>
          <div className="article-related__grid">
            {related.map((a) => (
              <Link
                key={a.handle}
                className="article-related__card"
                to={`/blogs/${blogHandle}/${a.handle}`}
                prefetch="intent"
              >
                {a.image && (
                  <div className="article-related__image">
                    <Image
                      alt={a.image.altText || a.title}
                      aspectRatio="3/2"
                      data={a.image}
                      loading="lazy"
                      sizes="(min-width: 768px) 33vw, 100vw"
                    />
                  </div>
                )}
                <div className="article-related__body">
                  <h3>{a.title}</h3>
                  <span className="article-card__link">
                    Read
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </aside>
      )}
    </section>
  );
}

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

const ARTICLE_QUERY = `#graphql
  query Article(
    $articleHandle: String!
    $blogHandle: String!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(language: $language, country: $country) {
    blog(handle: $blogHandle) {
      handle
      articleByHandle(handle: $articleHandle) {
        handle
        title
        contentHtml
        publishedAt
        author: authorV2 {
          name
        }
        image {
          id
          altText
          url
          width
          height
        }
        seo {
          description
          title
        }
      }
    }
  }
`;

const RELATED_ARTICLES_QUERY = `#graphql
  query RelatedArticles(
    $blogHandle: String!
    $first: Int
    $language: LanguageCode
  ) @inContext(language: $language) {
    articles(
      first: $first,
      query: "blog_handle:$blogHandle",
      sortKey: PUBLISHED_AT,
      reverse: true
    ) {
      nodes {
        handle
        title
        publishedAt
        contentHtml
        image {
          id
          altText
          url
          width
          height
        }
        blog {
          handle
        }
      }
    }
  }
`;

/** @typedef {import('./+types/blogs.$blogHandle.$articleHandle').Route} Route */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */

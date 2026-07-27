import {Pagination} from '@shopify/hydrogen';

/**
 * <PaginatedResourceSection> encapsulates the previous and next pagination behaviors.
 */
export function PaginatedResourceSection({
  connection,
  children,
  ariaLabel,
  resourcesClassName,
}) {
  return (
    <Pagination connection={connection}>
      {({nodes, isLoading, PreviousLink, NextLink}) => {
        const resourcesMarkup = nodes.map((node, index) =>
          children({node, index}),
        );

        return (
          <div className="pagination-wrapper">
            <PreviousLink className="pagination-link pagination-link--prev">
              {isLoading ? (
                <span className="pagination-loading">Loading...</span>
              ) : (
                <span className="pagination-text">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="18 15 12 9 6 15" />
                  </svg>
                  Load previous
                </span>
              )}
            </PreviousLink>

            <div
              aria-label={ariaLabel}
              className={resourcesClassName || 'products-grid'}
              role={ariaLabel ? 'region' : undefined}
            >
              {resourcesMarkup}
            </div>

            <NextLink className="pagination-link pagination-link--next">
              {isLoading ? (
                <span className="pagination-loading">Loading...</span>
              ) : (
                <span className="pagination-text">
                  Load more
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              )}
            </NextLink>
          </div>
        );
      }}
    </Pagination>
  );
}

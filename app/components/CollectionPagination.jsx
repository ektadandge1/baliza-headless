import {useSearchParams} from 'react-router';

export function CollectionPagination({totalItems, pageSize = 12}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const totalPages = Math.ceil(totalItems / pageSize);
  const currentPage = Math.min(
    Math.max(Number(searchParams.get('page')) || 1, 1),
    totalPages || 1,
  );

  if (totalPages <= 1) return null;

  const goToPage = (page) => {
    const next = new URLSearchParams(searchParams);
    if (page === 1) next.delete('page');
    else next.set('page', String(page));
    setSearchParams(next);
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  return (
    <nav className="collection-pagination" aria-label="Product pages">
      <button
        type="button"
        className="collection-pagination__arrow"
        onClick={() => goToPage(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
      >
        &larr;
      </button>
      <div className="collection-pagination__pages">
        {Array.from({length: totalPages}, (_, index) => index + 1).map((page) => (
          <button
            key={page}
            type="button"
            className={`collection-pagination__page ${page === currentPage ? 'is-active' : ''}`}
            onClick={() => goToPage(page)}
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="collection-pagination__arrow"
        onClick={() => goToPage(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Next page"
      >
        &rarr;
      </button>
    </nav>
  );
}

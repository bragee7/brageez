const Pagination = ({ total, page, size, onPageChange }) => {
  const totalPages = Math.max(1, Math.ceil(total / size));
  const from = total === 0 ? 0 : (page - 1) * size + 1;
  const to = Math.min(page * size, total);

  const pages = [];
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, Math.max(page + 2, 5));
  for (let p = start; p <= end; p++) pages.push(p);

  const btn =
    'px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mt-4 text-sm">
      <span className="text-gray-400">
        Showing <span className="text-white font-medium">{from}–{to}</span> of{' '}
        <span className="text-white font-medium">{total}</span>
      </span>
      <div className="flex items-center gap-1.5">
        <button
          className={`${btn} bg-gray-800 text-gray-300 hover:bg-gray-700`}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          ‹ Prev
        </button>
        {pages.map((p) => (
          <button
            key={p}
            className={`${btn} ${
              p === page
                ? 'bg-purple-600 text-white border-purple-500'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
            onClick={() => onPageChange(p)}
            aria-current={p === page ? 'page' : undefined}
          >
            {p}
          </button>
        ))}
        <button
          className={`${btn} bg-gray-800 text-gray-300 hover:bg-gray-700`}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          Next ›
        </button>
      </div>
    </div>
  );
};

export default Pagination;
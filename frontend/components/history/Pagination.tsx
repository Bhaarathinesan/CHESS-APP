'use client';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const pages = [];
  const maxVisiblePages = 5;

  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage < maxVisiblePages - 1) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center space-x-2 mt-6">
      {/* Previous Button */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-2 bg-background-secondary border border-border rounded-lg text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-background hover:border-primary transition-colors"
      >
        Previous
      </button>

      {/* First Page */}
      {startPage > 1 && (
        <>
          <button
            onClick={() => onPageChange(1)}
            className="px-3 py-2 bg-background-secondary border border-border rounded-lg text-foreground hover:bg-background hover:border-primary transition-colors"
          >
            1
          </button>
          {startPage > 2 && <span className="text-foreground-secondary">...</span>}
        </>
      )}

      {/* Page Numbers */}
      {pages.map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`px-3 py-2 rounded-lg transition-colors ${
            page === currentPage
              ? 'bg-primary text-white'
              : 'bg-background-secondary border border-border text-foreground hover:bg-background hover:border-primary'
          }`}
        >
          {page}
        </button>
      ))}

      {/* Last Page */}
      {endPage < totalPages && (
        <>
          {endPage < totalPages - 1 && <span className="text-foreground-secondary">...</span>}
          <button
            onClick={() => onPageChange(totalPages)}
            className="px-3 py-2 bg-background-secondary border border-border rounded-lg text-foreground hover:bg-background hover:border-primary transition-colors"
          >
            {totalPages}
          </button>
        </>
      )}

      {/* Next Button */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-2 bg-background-secondary border border-border rounded-lg text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-background hover:border-primary transition-colors"
      >
        Next
      </button>
    </div>
  );
}

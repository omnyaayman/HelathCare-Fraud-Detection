import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const maxVisible = 5;
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);

  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex flex-col gap-3 pt-4 text-sm sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs font-semibold text-textSecondary">
        Page {currentPage} of {totalPages}
      </span>
      <div className="flex flex-wrap items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="rounded-lg border border-border bg-surface p-2 text-textSecondary hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft size={14} />
        </button>
        {start > 1 && (
          <>
            <button onClick={() => onPageChange(1)} className="rounded-lg px-3 py-2 text-xs font-bold text-textSecondary hover:bg-primary/10 hover:text-primary">1</button>
            {start > 2 && <span className="px-1 text-textSecondary/50">...</span>}
          </>
        )}
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`rounded-lg px-3 py-2 text-xs font-bold ${
              p === currentPage
                ? 'border border-primary bg-primary text-white shadow-lg shadow-primary/20'
                : 'text-textSecondary hover:bg-primary/10 hover:text-primary'
            }`}
          >
            {p}
          </button>
        ))}
        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="px-1 text-textSecondary/50">...</span>}
            <button onClick={() => onPageChange(totalPages)} className="rounded-lg px-3 py-2 text-xs font-bold text-textSecondary hover:bg-primary/10 hover:text-primary">{totalPages}</button>
          </>
        )}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="rounded-lg border border-border bg-surface p-2 text-textSecondary hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

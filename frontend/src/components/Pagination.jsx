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
    <div className="flex items-center justify-between pt-4 text-sm">
      <span className="text-textSecondary text-xs">
        Page {currentPage} of {totalPages}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-md border border-border text-textSecondary hover:text-textPrimary hover:border-textSecondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-150"
        >
          <ChevronLeft size={14} />
        </button>
        {start > 1 && (
          <>
            <button onClick={() => onPageChange(1)} className="px-2.5 py-1 rounded-md text-xs text-textSecondary hover:text-textPrimary hover:bg-[#1c2128] transition-colors duration-150">1</button>
            {start > 2 && <span className="px-1 text-textSecondary/50">...</span>}
          </>
        )}
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`px-2.5 py-1 rounded-md text-xs transition-colors duration-150 ${
              p === currentPage
                ? 'bg-primary/15 text-primary border border-primary/30'
                : 'text-textSecondary hover:text-textPrimary hover:bg-[#1c2128]'
            }`}
          >
            {p}
          </button>
        ))}
        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="px-1 text-textSecondary/50">...</span>}
            <button onClick={() => onPageChange(totalPages)} className="px-2.5 py-1 rounded-md text-xs text-textSecondary hover:text-textPrimary hover:bg-[#1c2128] transition-colors duration-150">{totalPages}</button>
          </>
        )}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-md border border-border text-textSecondary hover:text-textPrimary hover:border-textSecondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-150"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

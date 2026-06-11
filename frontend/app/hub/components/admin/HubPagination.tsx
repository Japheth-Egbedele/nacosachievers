type HubPaginationProps = {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
};

export default function HubPagination({
  page,
  limit,
  total,
  onPageChange,
  className = '',
}: HubPaginationProps) {
  if (total <= limit) return null;

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div
      className={`flex flex-col gap-3 border-t border-[var(--color-hub-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${className}`.trim()}
    >
      <p className="text-sm text-[var(--color-hub-text-secondary)]">
        Showing {start}–{end} of {total}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg border border-[var(--color-hub-border)] px-3 py-1.5 text-sm font-medium text-[var(--color-hub-text-secondary)] transition hover:border-[var(--color-brand)]/30 hover:text-[var(--color-brand)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        <span className="text-sm tabular-nums text-[var(--color-hub-text-secondary)]">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-lg border border-[var(--color-hub-border)] px-3 py-1.5 text-sm font-medium text-[var(--color-hub-text-secondary)] transition hover:border-[var(--color-brand)]/30 hover:text-[var(--color-brand)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

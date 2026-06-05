export default function Spinner({ className = '' }: { className?: string }) {
  return (
    <div
      className={`inline-block h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-emerald-600 dark:border-zinc-700 dark:border-t-emerald-500 ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

export function SpinnerCenter({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <Spinner />
      {label && <p className="text-sm text-zinc-500">{label}</p>}
    </div>
  );
}

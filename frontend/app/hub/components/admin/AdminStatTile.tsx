type AdminStatTileProps = {
  label: string;
  value: string;
  className?: string;
};

export default function AdminStatTile({ label, value, className = '' }: AdminStatTileProps) {
  return (
    <div className={`hub-card p-4 ${className}`.trim()}>
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-hub-muted)]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--color-brand)]">{value}</p>
    </div>
  );
}

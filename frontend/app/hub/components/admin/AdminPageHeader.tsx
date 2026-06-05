export default function AdminPageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-8 border-b border-[var(--color-hub-border)] pb-6">
      <h1 className="hub-display text-2xl text-[var(--color-hub-text)]">{title}</h1>
      {description && (
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--color-hub-text-secondary)]">
          {description}
        </p>
      )}
    </div>
  );
}

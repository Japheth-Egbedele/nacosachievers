type Tab = { key: string; label: string };

type HubPillTabsProps = {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
};

export default function HubPillTabs({ tabs, active, onChange }: HubPillTabsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((t) => {
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={
              isActive
                ? 'rounded-full bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white shadow-sm'
                : 'rounded-full border border-[var(--color-hub-border)] bg-[var(--color-hub-surface)] px-4 py-2 text-sm font-medium text-[var(--color-hub-text-secondary)] transition hover:border-[var(--color-brand)]/30 hover:text-[var(--color-brand)]'
            }
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

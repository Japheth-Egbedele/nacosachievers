type Tab = { key: string; label: string };

type HubPillTabsProps = {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
};

export default function HubPillTabs({ tabs, active, onChange, className = '' }: HubPillTabsProps) {
  return (
    <div
      className={`-mx-1 overflow-x-auto overscroll-x-contain px-1 pb-1 ${className}`.trim()}
      role="tablist"
    >
      <div className="flex w-max min-w-full flex-nowrap gap-2 sm:w-auto sm:flex-wrap">
        {tabs.map((t) => {
          const isActive = active === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(t.key)}
              className={
                isActive
                  ? 'shrink-0 rounded-full bg-[var(--color-brand)] px-4 py-2.5 text-sm font-medium text-white shadow-sm'
                  : 'shrink-0 rounded-full border border-[var(--color-hub-border)] bg-[var(--color-hub-surface)] px-4 py-2.5 text-sm font-medium text-[var(--color-hub-text-secondary)] transition hover:border-[var(--color-brand)]/30 hover:text-[var(--color-brand)]'
              }
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

'use client';

import { useEffect } from 'react';

type HubDrawerProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Which edge the panel slides from */
  side?: 'left' | 'right';
};

export default function HubDrawer({
  open,
  onClose,
  title = 'Menu',
  children,
  side = 'left',
}: HubDrawerProps) {
  useEffect(() => {
    if (!open) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const panelPosition = side === 'left' ? 'left-0' : 'right-0';

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
      <button
        type="button"
        aria-label="Close menu"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`absolute inset-y-0 ${panelPosition} z-10 flex w-[min(100vw-2.5rem,18rem)] max-w-full flex-col border-[var(--color-hub-border)] bg-[var(--color-hub-surface)] shadow-xl ${
          side === 'left' ? 'border-r' : 'border-l'
        }`}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--color-hub-border)] px-4">
          <p className="text-sm font-semibold text-[var(--color-hub-text)]">{title}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800"
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </aside>
    </div>
  );
}

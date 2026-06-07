'use client';

import { useEffect, useId, useRef } from 'react';

type HubModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  /** sm | md | lg */
  size?: 'sm' | 'md' | 'lg';
};

const sizeClass = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
};

export default function HubModal({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
}: HubModalProps) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    panelRef.current?.focus();

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={`relative z-10 flex max-h-[min(90vh,720px)] w-full flex-col overflow-hidden rounded-2xl border border-[var(--color-hub-border)] bg-[var(--color-hub-surface)] shadow-xl ${sizeClass[size]}`}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--color-hub-border)] px-5 py-4 sm:px-6">
          <div>
            <h2 id={titleId} className="hub-display text-xl text-[var(--color-hub-text)]">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-1 text-sm text-[var(--color-hub-text-secondary)]">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">{children}</div>
      </div>
    </div>
  );
}

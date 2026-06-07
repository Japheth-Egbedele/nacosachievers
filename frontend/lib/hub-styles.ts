/** Shared Tailwind class strings for Hub UI — brand colors via CSS variables in globals.css */

export const hubInput =
  'hub-input w-full rounded-xl px-3.5 py-2.5 text-sm placeholder:text-[var(--color-hub-muted)] transition';

export const hubLabel = 'block text-sm font-medium text-[var(--color-hub-text)]';

export const hubBtnPrimary =
  'hub-btn-primary inline-flex min-h-[44px] w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition sm:w-auto';

export const hubBtnSecondary =
  'inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[var(--color-hub-border)] bg-[var(--color-hub-surface)] px-4 py-2.5 text-sm font-medium text-[var(--color-hub-text-secondary)] transition hover:border-[var(--color-brand)]/30 hover:bg-[var(--color-brand-soft)] disabled:opacity-60';

export const hubBtnGhost =
  'inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--color-hub-text-secondary)] transition hover:bg-[var(--color-hub-surface-muted)] hover:text-[var(--color-hub-text)]';

export const hubAuthCard =
  'w-full max-w-md rounded-2xl border border-[var(--color-hub-border)] bg-[var(--color-hub-surface)] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.06)]';

export const hubPageTitle = 'hub-display text-2xl text-[var(--color-hub-text)] sm:text-3xl';

export const hubPageSubtitle =
  'mt-2 max-w-xl text-sm leading-relaxed text-[var(--color-hub-text-secondary)]';

export const hubLink = 'hub-link';

export const hubListCard =
  'hub-card hub-card-hover flex flex-wrap items-center justify-between gap-3 p-4';

export const hubEmptyState =
  'hub-card-muted px-6 py-12 text-center text-sm text-[var(--color-hub-text-secondary)]';

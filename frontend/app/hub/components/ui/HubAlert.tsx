type HubAlertProps = {
  variant: 'error' | 'success' | 'info';
  children: React.ReactNode;
  className?: string;
};

const styles = {
  error:
    'border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300',
  success:
    'border-[var(--color-brand)]/25 bg-[var(--color-brand-soft)] text-[var(--color-brand-hover)]',
  info: 'border-[var(--color-hub-border)] bg-[var(--color-hub-surface-muted)] text-[var(--color-hub-text-secondary)]',
};

export default function HubAlert({ variant, children, className = '' }: HubAlertProps) {
  return (
    <p className={`rounded-xl border px-4 py-3 text-sm ${styles[variant]} ${className}`}>
      {children}
    </p>
  );
}

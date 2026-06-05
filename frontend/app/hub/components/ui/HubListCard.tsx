import { hubEmptyState, hubListCard } from '@/lib/hub-styles';

type HubListCardProps = {
  children: React.ReactNode;
  className?: string;
};

export function HubListCard({ children, className = '' }: HubListCardProps) {
  return <li className={`${hubListCard} ${className}`}>{children}</li>;
}

export function HubListEmpty({ title, description }: { title: string; description?: string }) {
  return (
    <li className={hubEmptyState}>
      <p className="hub-display text-lg text-[var(--color-hub-text)]">{title}</p>
      {description && <p className="mt-2">{description}</p>}
    </li>
  );
}

export function HubList({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <ul className={`space-y-3 ${className}`}>{children}</ul>;
}

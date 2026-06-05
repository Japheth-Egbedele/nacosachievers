import Link from 'next/link';
import HubAuthBrand from '@/app/components/HubAuthBrand';
import { hubAuthCard } from '@/lib/hub-styles';

type HubAuthLayoutProps = {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export default function HubAuthLayout({ title, subtitle, children, footer }: HubAuthLayoutProps) {
  return (
    <div className="hub-auth-bg flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className={hubAuthCard}>
        <HubAuthBrand />
        <h1 className="hub-display text-center text-3xl text-zinc-900 dark:text-white">{title}</h1>
        {subtitle && <div className="mt-3 text-center text-sm text-zinc-500">{subtitle}</div>}
        {children}
      </div>
      {footer ?? (
        <Link
          href="/"
          className="mt-8 text-sm text-zinc-500 transition hover:text-emerald-700"
        >
          ← Back to chapter site
        </Link>
      )}
    </div>
  );
}

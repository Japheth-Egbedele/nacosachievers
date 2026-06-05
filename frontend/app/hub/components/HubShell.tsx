'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { SpinnerCenter } from '@/app/components/Spinner';
import BrandLogo from '@/app/components/BrandLogo';
import { useAuth } from '@/lib/auth-context';

const memberLinks = [
  { href: '/hub/dashboard', label: 'Dashboard' },
  { href: '/hub/elections', label: 'Elections' },
];

export default function HubShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, isAdmin, isSuperAdmin } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (loading) {
    return <SpinnerCenter />;
  }

  if (!user) {
    router.replace('/hub/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <BrandLogo href="/hub/dashboard" label="Hub" size="sm" />
          <nav className="flex items-center gap-4 text-sm">
            {memberLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={
                  pathname === l.href || pathname?.startsWith(`${l.href}/`)
                    ? 'font-semibold text-emerald-700'
                    : 'text-zinc-600 hover:text-zinc-900'
                }
              >
                {l.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/hub/admin"
                className={
                  pathname?.startsWith('/hub/admin')
                    ? 'font-semibold text-emerald-700'
                    : 'text-zinc-600'
                }
              >
                Admin
              </Link>
            )}
            <button
              type="button"
              onClick={() => logout().then(() => router.push('/hub/login'))}
              className="text-zinc-500 hover:text-zinc-800"
            >
              Log out
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}

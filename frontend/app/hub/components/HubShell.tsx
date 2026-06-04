'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
    return (
      <div className="flex min-h-screen items-center justify-center text-zinc-500">Loading…</div>
    );
  }

  if (!user) {
    router.replace('/hub/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/hub/dashboard" className="font-bold text-emerald-700 dark:text-emerald-400">
            NACOS Hub
          </Link>
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
            {isSuperAdmin && (
              <Link
                href="/hub/admin/pins"
                className={
                  pathname === '/hub/admin/pins'
                    ? 'font-semibold text-emerald-700'
                    : 'text-zinc-600'
                }
              >
                PINs
              </Link>
            )}
            {isAdmin && (
              <Link
                href="/hub/admin/elections"
                className={
                  pathname?.startsWith('/hub/admin/elections')
                    ? 'font-semibold text-emerald-700'
                    : 'text-zinc-600'
                }
              >
                Elections
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

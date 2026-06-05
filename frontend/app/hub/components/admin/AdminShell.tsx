'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { SpinnerCenter } from '@/app/components/Spinner';
import { filterAdminNav } from '@/lib/admin-nav';
import { useAuth } from '@/lib/auth-context';

function navActive(pathname: string, href: string): boolean {
  if (href === '/hub/admin') return pathname === '/hub/admin';
  return pathname === href || pathname?.startsWith(`${href}/`) === true;
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { loading, isAdmin, isSuperAdmin } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const links = filterAdminNav(isSuperAdmin);

  if (loading) {
    return <SpinnerCenter label="Loading admin…" />;
  }

  if (!isAdmin) {
    router.replace('/hub/dashboard');
    return null;
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <aside className="w-full shrink-0 lg:w-52">
        <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Admin
          </p>
          <nav className="flex flex-col gap-0.5">
            {links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={
                  navActive(pathname ?? '', item.href)
                    ? 'rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                    : 'rounded-lg px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800'
                }
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/hub/dashboard"
            className="mt-3 block border-t border-zinc-100 px-2 pt-3 text-xs text-zinc-500 hover:text-emerald-700 dark:border-zinc-800"
          >
            ← Member hub
          </Link>
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

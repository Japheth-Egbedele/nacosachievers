'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SpinnerCenter } from '@/app/components/Spinner';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { getHubGreeting } from '@/lib/hub-greeting';

interface DashboardData {
  stats: {
    active_elections: number;
    upcoming_elections: number;
    completed_elections: number;
    total_votes_cast: number;
  };
  active_elections: Array<{ id: string; title: string; status: string; user_has_voted: boolean }>;
}

export default function DashboardPage() {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const greeting = getHubGreeting(user);

  useEffect(() => {
    apiFetch<DashboardData>('/elections/dashboard')
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <SpinnerCenter />;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{greeting.heading}</h1>
      {greeting.subtext && (
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">{greeting.subtext}</p>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active elections" value={data?.stats.active_elections ?? 0} />
        <StatCard label="Upcoming" value={data?.stats.upcoming_elections ?? 0} />
        <StatCard label="Completed" value={data?.stats.completed_elections ?? 0} />
        <StatCard label="Your votes cast" value={data?.stats.total_votes_cast ?? 0} />
      </div>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Live elections</h2>
          <Link href="/hub/elections" className="text-sm font-medium text-emerald-600 hover:underline">
            View all →
          </Link>
        </div>
        <ul className="mt-4 space-y-3">
          {(data?.active_elections ?? []).length === 0 && (
            <li className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-zinc-500">
              No active elections right now.
            </li>
          )}
          {(data?.active_elections ?? []).map((e) => (
            <li key={e.id}>
              <Link
                href={`/hub/elections/${e.id}`}
                className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 hover:border-emerald-300 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <span className="font-medium">{e.title}</span>
                <span className="text-sm text-zinc-500">
                  {e.user_has_voted ? 'Voted ✓' : 'Vote now →'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {isAdmin && (
        <Link
          href="/hub/admin"
          className="mt-8 inline-block rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40"
        >
          Open admin portal
        </Link>
      )}
      {isSuperAdmin && (
        <Link
          href="/hub/admin/pins"
          className="mt-4 ml-0 inline-block rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 sm:ml-4"
        >
          Issue onboarding PINs
        </Link>
      )}

      <p className="mt-12 text-sm text-zinc-400">Vault, wallet, and more — coming soon.</p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

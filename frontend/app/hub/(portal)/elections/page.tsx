'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SpinnerCenter } from '@/app/components/Spinner';
import HubPageHeader from '@/app/hub/components/ui/HubPageHeader';
import HubPillTabs from '@/app/hub/components/ui/HubPillTabs';
import { apiFetch } from '@/lib/api';

interface Election {
  id: string;
  title: string;
  description?: string;
  status: string;
  start_date: string;
  end_date: string;
  user_has_voted: boolean;
}

const tabs = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Live' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Closed' },
];

export default function ElectionsPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [filter, setFilter] = useState<string>('active');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const q = filter === 'all' ? '' : `?status=${filter}`;
    apiFetch<{ elections: Election[] }>(`/elections${q}`)
      .then((d) => setElections(d.elections))
      .catch(() => setElections([]))
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div>
      <HubPageHeader
        title="Chapter elections"
        description="Vote in live elections. View final results when voting closes — one ballot per election."
      />

      <HubPillTabs tabs={tabs} active={filter} onChange={setFilter} />

      {loading ? (
        <div className="mt-10">
          <SpinnerCenter label="Loading elections…" />
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {elections.length === 0 && (
            <li className="rounded-2xl border border-dashed border-[#e8e6e1] bg-[#fafaf8] px-6 py-12 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
              <p className="hub-display text-xl text-zinc-700 dark:text-zinc-300">Nothing here yet</p>
              <p className="mt-2 text-sm text-zinc-500">
                {filter === 'active'
                  ? 'No live elections right now. Check Upcoming or Closed.'
                  : 'No elections in this category.'}
              </p>
            </li>
          )}
          {elections.map((e) => (
            <li key={e.id}>
              <Link
                href={`/hub/elections/${e.id}`}
                className="hub-card-hover hub-card block p-5 dark:border-zinc-800 dark:bg-zinc-900/80"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{e.title}</h2>
                    {e.description && (
                      <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-zinc-500">
                        {e.description}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={e.status} />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                  <span>
                    {formatDate(e.start_date)} — {formatDate(e.end_date)}
                  </span>
                  {e.status === 'active' && (
                    <span
                      className={
                        e.user_has_voted
                          ? 'rounded-full bg-emerald-100 px-2.5 py-0.5 font-medium text-emerald-800'
                          : 'rounded-full bg-amber-100 px-2.5 py-0.5 font-medium text-amber-900'
                      }
                    >
                      {e.user_has_voted ? 'You voted ✓' : 'Vote now →'}
                    </span>
                  )}
                  {e.status === 'completed' && (
                    <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 font-medium text-zinc-600">
                      View results →
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200',
    upcoming: 'bg-amber-50 text-amber-900 ring-1 ring-amber-200',
    completed: 'bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200',
  };
  const labels: Record<string, string> = {
    active: 'Live',
    upcoming: 'Upcoming',
    completed: 'Closed',
  };
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${styles[status] ?? 'bg-zinc-100'}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

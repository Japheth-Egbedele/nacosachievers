'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
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

export default function ElectionsPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    const q = filter === 'all' ? '' : `?status=${filter}`;
    apiFetch<{ elections: Election[] }>(`/elections${q}`)
      .then((d) => setElections(d.elections))
      .catch(() => setElections([]));
  }, [filter]);

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Live' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'completed', label: 'Closed' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">Elections</h1>
      <p className="mt-2 text-zinc-600">
        Chapter-wide elections — one contestant per position, one locked ballot per election.
      </p>

      <div className="mt-6 flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setFilter(t.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              filter === t.key
                ? 'bg-emerald-600 text-white'
                : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <ul className="mt-8 space-y-4">
        {elections.length === 0 && (
          <li className="rounded-xl border border-dashed p-8 text-center text-zinc-500">
            No elections in this category.
          </li>
        )}
        {elections.map((e) => (
          <li key={e.id}>
            <Link
              href={`/hub/elections/${e.id}`}
              className="block rounded-xl border border-zinc-200 bg-white p-5 hover:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold">{e.title}</h2>
                  {e.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{e.description}</p>
                  )}
                </div>
                <StatusBadge status={e.status} />
              </div>
              <p className="mt-3 text-xs text-zinc-400">
                {formatDate(e.start_date)} — {formatDate(e.end_date)}
                {e.user_has_voted && ' · You voted'}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    upcoming: 'bg-amber-100 text-amber-800',
    completed: 'bg-zinc-100 text-zinc-600',
  };
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${styles[status] ?? ''}`}>
      {status}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

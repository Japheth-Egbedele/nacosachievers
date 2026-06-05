'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SpinnerCenter } from '@/app/components/Spinner';
import { apiFetch, ApiClientError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface Election {
  id: string;
  title: string;
  status: string;
  start_date: string;
  end_date: string;
  vote_count?: number;
}

export default function AdminElectionsPage() {
  const { isAdmin, loading } = useAuth();
  const router = useRouter();
  const [elections, setElections] = useState<Election[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && !isAdmin) router.replace('/hub/dashboard');
  }, [loading, isAdmin, router]);

  const load = () => {
    setDataLoading(true);
    apiFetch<{ elections: Election[] }>('/admin/elections')
      .then((d) => setElections(d.elections))
      .catch(() => setElections([]))
      .finally(() => setDataLoading(false));
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  async function createElection(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const start = new Date(startDate).toISOString();
      const end = new Date(endDate).toISOString();
      await apiFetch('/admin/elections', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description: description || undefined,
          start_date: start,
          end_date: end,
        }),
      });
      setShowForm(false);
      setTitle('');
      setDescription('');
      setStartDate('');
      setEndDate('');
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to create');
    }
  }

  if (loading || !isAdmin) return null;
  if (dataLoading) return <SpinnerCenter label="Loading elections…" />;

  return (
    <div>
      <h1 className="text-2xl font-bold">Manage elections</h1>
      <button
        type="button"
        onClick={() => setShowForm(!showForm)}
        className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
      >
        {showForm ? 'Cancel' : 'New election'}
      </button>

      {showForm && (
        <form onSubmit={createElection} className="mt-6 max-w-lg space-y-4 rounded-xl border p-6">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <input
            placeholder="Title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 dark:bg-zinc-800"
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 dark:bg-zinc-800"
          />
          <div>
            <label className="text-sm">Start</label>
            <input
              type="datetime-local"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 dark:bg-zinc-800"
            />
          </div>
          <div>
            <label className="text-sm">End</label>
            <input
              type="datetime-local"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 dark:bg-zinc-800"
            />
          </div>
          <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-white">
            Create
          </button>
        </form>
      )}

      <ul className="mt-8 space-y-3">
        {elections.map((e) => (
          <li
            key={e.id}
            className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <div>
              <p className="font-medium">{e.title}</p>
              <p className="text-xs text-zinc-500">
                {e.status} · {e.vote_count ?? 0} votes
              </p>
            </div>
            <Link
              href={`/hub/admin/elections/${e.id}`}
              className="text-sm font-medium text-emerald-600 hover:underline"
            >
              Manage →
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

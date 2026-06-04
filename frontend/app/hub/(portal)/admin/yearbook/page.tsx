'use client';

import { useEffect, useState } from 'react';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import { apiFetch, ApiClientError } from '@/lib/api';

interface Edition {
  id: string;
  title: string;
  status: string;
  submissions_open: boolean;
}

export default function AdminYearbookPage() {
  const [editions, setEditions] = useState<Edition[]>([]);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    apiFetch<Edition[]>('/admin/yearbook/editions')
      .then(setEditions)
      .catch(() => setEditions([]));
  };

  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await apiFetch('/admin/yearbook/editions', {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), submissions_open: true }),
      });
      setTitle('');
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Create failed');
    }
  }

  async function toggleOpen(id: string, open: boolean) {
    try {
      await apiFetch(`/admin/yearbook/editions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ submissions_open: !open }),
      });
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Update failed');
    }
  }

  return (
    <div>
      <AdminPageHeader title="Yearbook" description="Create editions and toggle submission windows." />
      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <form onSubmit={create} className="mb-6 flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Edition title (e.g. Class of 2026)"
          className="flex-1 rounded-lg border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          required
        />
        <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white">
          Create edition
        </button>
      </form>
      <ul className="space-y-3">
        {editions.map((ed) => (
          <li
            key={ed.id}
            className="flex justify-between rounded-xl border px-4 py-3 dark:border-zinc-800"
          >
            <div>
              <p className="font-medium">{ed.title}</p>
              <p className="text-xs text-zinc-500">
                {ed.status} · submissions {ed.submissions_open ? 'open' : 'closed'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggleOpen(ed.id, ed.submissions_open)}
              className="text-sm text-emerald-600"
            >
              {ed.submissions_open ? 'Close' : 'Open'} submissions
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

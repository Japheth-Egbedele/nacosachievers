'use client';

import { useEffect, useState } from 'react';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import { SpinnerCenter } from '@/app/components/Spinner';
import { apiFetch, ApiClientError } from '@/lib/api';

interface Edition {
  id: string;
  title: string;
  status: string;
  submissions_open: boolean;
}

const CLASS_TITLE_PATTERN = /^Class of \d{4}\/\d{4}$/i;

export default function AdminYearbookPage() {
  const [editions, setEditions] = useState<Edition[]>([]);
  const [title, setTitle] = useState('');
  const [titleHint, setTitleHint] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    apiFetch<Edition[]>('/admin/yearbook/editions')
      .then(setEditions)
      .catch(() => setEditions([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  function validateTitle(value: string) {
    if (!value.trim()) {
      setTitleHint('');
      return;
    }
    if (!CLASS_TITLE_PATTERN.test(value.trim())) {
      setTitleHint('Suggested format: Class of 2022/2023');
    } else {
      setTitleHint('');
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await apiFetch('/admin/yearbook/editions', {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), submissions_open: true }),
      });
      setTitle('');
      setTitleHint('');
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

  if (loading) return <SpinnerCenter />;

  return (
    <div>
      <AdminPageHeader
        title="Yearbook"
        description="Editions use session-style titles (Class of 2022/2023). Student matric numbers follow AU23AY4578 format."
      />
      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <form onSubmit={create} className="mb-6 space-y-2">
        <div className="flex flex-wrap gap-2">
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              validateTitle(e.target.value);
            }}
            onBlur={() => validateTitle(title)}
            placeholder="Class of 2022/2023"
            className="min-w-[14rem] flex-1 rounded-lg border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            required
          />
          <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white">
            Create edition
          </button>
        </div>
        {titleHint && <p className="text-xs text-amber-700">{titleHint}</p>}
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

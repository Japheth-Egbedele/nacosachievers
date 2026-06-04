'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import AdminPageHeader from '../../../../components/admin/AdminPageHeader';
import { apiFetch, ApiClientError } from '@/lib/api';

interface Ann {
  id: string;
  title: string;
  is_active: boolean;
}

export default function AdminAnnouncementsPage() {
  const [list, setList] = useState<Ann[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    apiFetch<Ann[]>('/admin/announcements')
      .then(setList)
      .catch(() => setList([]));
  };

  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await apiFetch('/admin/announcements', {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), body: body.trim(), target: 'members' }),
      });
      setTitle('');
      setBody('');
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed');
    }
  }

  return (
    <div>
      <Link href="/hub/admin/cms" className="text-sm text-emerald-600 hover:underline">
        ← CMS
      </Link>
      <AdminPageHeader title="Announcements" description="Member-facing announcements." />
      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <form onSubmit={create} className="mb-6 space-y-3 rounded-xl border p-4 dark:border-zinc-800">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="w-full rounded-lg border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          required
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Body"
          rows={3}
          className="w-full rounded-lg border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          required
        />
        <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white">
          Create
        </button>
      </form>
      <ul className="space-y-2 text-sm">
        {list.map((a) => (
          <li key={a.id} className="rounded-lg border px-4 py-2 dark:border-zinc-800">
            {a.title} {a.is_active ? '' : '(inactive)'}
          </li>
        ))}
      </ul>
    </div>
  );
}

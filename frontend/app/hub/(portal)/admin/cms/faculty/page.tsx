'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import AdminPageHeader from '../../../../components/admin/AdminPageHeader';
import { apiFetch, ApiClientError } from '@/lib/api';

interface Faculty {
  id: string;
  name: string;
  position: string;
}

export default function AdminFacultyPage() {
  const [list, setList] = useState<Faculty[]>([]);
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    apiFetch<Faculty[]>('/admin/faculty')
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
      await apiFetch('/admin/faculty', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), position: position.trim() }),
      });
      setName('');
      setPosition('');
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
      <AdminPageHeader title="Faculty" description="Department faculty listings for the public site." />
      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <form onSubmit={create} className="mb-6 flex flex-wrap gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="rounded-lg border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          required
        />
        <input
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          placeholder="Position"
          className="rounded-lg border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          required
        />
        <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white">
          Add
        </button>
      </form>
      <ul className="space-y-2 text-sm">
        {list.map((f) => (
          <li key={f.id} className="rounded-lg border px-4 py-2 dark:border-zinc-800">
            {f.name} — {f.position}
          </li>
        ))}
      </ul>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import { apiFetch, ApiClientError } from '@/lib/api';

interface Lecturer {
  id: string;
  name: string;
  department?: string;
}

export default function AdminLecturersPage() {
  const [list, setList] = useState<Lecturer[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    apiFetch<Lecturer[]>('/admin/lecturers')
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
      await apiFetch('/admin/lecturers', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim() }),
      });
      setName('');
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed');
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete lecturer?')) return;
    try {
      await apiFetch(`/admin/lecturers/${id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Delete failed');
    }
  }

  return (
    <div>
      <AdminPageHeader title="Lecturers" description="Lecturers used for vault course assignments." />
      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <form onSubmit={create} className="mb-6 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Lecturer name"
          className="flex-1 rounded-lg border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          required
        />
        <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white">
          Add
        </button>
      </form>
      <ul className="space-y-2">
        {list.map((l) => (
          <li
            key={l.id}
            className="flex justify-between rounded-xl border px-4 py-3 dark:border-zinc-800"
          >
            <span>{l.name}</span>
            <button type="button" onClick={() => remove(l.id)} className="text-sm text-red-600">
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

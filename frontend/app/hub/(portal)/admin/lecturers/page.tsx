'use client';

import { useEffect, useState } from 'react';
import { SpinnerCenter } from '@/app/components/Spinner';
import HubAlert from '@/app/hub/components/ui/HubAlert';
import { HubList, HubListCard } from '@/app/hub/components/ui/HubListCard';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import { hubBtnPrimary, hubInput } from '@/lib/hub-styles';
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
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    apiFetch<Lecturer[]>('/admin/lecturers')
      .then(setList)
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = window.setTimeout(() => load(), 0);
    return () => window.clearTimeout(t);
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
      {error && <HubAlert variant="error" className="mb-4">{error}</HubAlert>}
      <form onSubmit={create} className="mb-6 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Lecturer name"
          className={`${hubInput} flex-1`}
          required
        />
        <button type="submit" className={`${hubBtnPrimary} w-auto shrink-0 px-5`}>
          Add
        </button>
      </form>
      {loading ? (
        <SpinnerCenter />
      ) : (
        <HubList>
          {list.map((l) => (
            <HubListCard key={l.id}>
              <span className="text-[var(--color-hub-text)]">{l.name}</span>
              <button
                type="button"
                onClick={() => remove(l.id)}
                className="text-sm font-medium text-red-600 hover:underline"
              >
                Delete
              </button>
            </HubListCard>
          ))}
        </HubList>
      )}
    </div>
  );
}

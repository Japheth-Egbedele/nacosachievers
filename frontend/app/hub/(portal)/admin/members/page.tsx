'use client';

import { useCallback, useEffect, useState } from 'react';
import { SpinnerCenter } from '@/app/components/Spinner';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import { apiFetch, apiFetchPaginated, ApiClientError } from '@/lib/api';

interface Member {
  id: string;
  matric_number: string;
  email: string;
  role: string;
  first_name: string;
  last_name: string;
  is_email_verified: boolean;
  is_active: boolean;
  academic_status: string;
}

export default function AdminMembersPage() {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<Member[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    const q = search.trim() ? `?search=${encodeURIComponent(search.trim())}&limit=50` : '?limit=50';
    setLoading(true);
    apiFetchPaginated<Member>(`/admin/members${q}`)
      .then((r) => setItems(r.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  async function patchMember(id: string, patch: Record<string, unknown>) {
    setError('');
    setBusyId(id);
    try {
      await apiFetch(`/admin/members/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  }

  if (loading && items.length === 0) {
    return <SpinnerCenter />;
  }

  return (
    <div>
      <AdminPageHeader
        title="Members"
        description="Search members, toggle active status, or verify email for test accounts."
      />
      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Matric, email, name…"
          className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Search
        </button>
      </form>
      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900">
            <tr>
              <th className="px-4 py-3">Matric</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Verified</th>
              <th className="px-4 py-3">Active</th>
            </tr>
          </thead>
          <tbody>
            {items.map((m) => (
              <tr key={m.id} className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="px-4 py-3 font-mono text-xs">{m.matric_number}</td>
                <td className="px-4 py-3">
                  {m.first_name} {m.last_name}
                  <div className="text-xs text-zinc-500">{m.email}</div>
                </td>
                <td className="px-4 py-3">{m.role}</td>
                <td className="px-4 py-3">{m.is_email_verified ? 'Yes' : 'No'}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={busyId === m.id}
                    onClick={() => patchMember(m.id, { is_active: !m.is_active })}
                    className="text-emerald-600 hover:underline"
                  >
                    {m.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-zinc-500">No members found.</p>
        )}
      </div>
      <p className="mt-3 text-xs text-zinc-500">
        To mark email verified for test voters, run SQL:{' '}
        <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
          update users set is_email_verified = true where matric_number = &apos;…&apos;;
        </code>
      </p>
    </div>
  );
}

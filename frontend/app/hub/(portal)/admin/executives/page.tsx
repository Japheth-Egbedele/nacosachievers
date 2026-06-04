'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import { apiFetch, ApiClientError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface Assignment {
  id: string;
  role_title: string;
  created_at: string;
  users?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    matric_number: string;
  };
}

export default function AdminExecutivesPage() {
  const { isSuperAdmin, loading } = useAuth();
  const router = useRouter();
  const [list, setList] = useState<Assignment[]>([]);
  const [userId, setUserId] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    apiFetch<Assignment[]>('/admin/executives')
      .then(setList)
      .catch(() => setList([]));
  };

  useEffect(() => {
    if (!loading && !isSuperAdmin) router.replace('/hub/admin');
  }, [loading, isSuperAdmin, router]);

  useEffect(() => {
    if (isSuperAdmin) load();
  }, [isSuperAdmin]);

  async function assign(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await apiFetch('/admin/executives/assign', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId.trim(), role_title: roleTitle.trim() }),
      });
      setUserId('');
      setRoleTitle('');
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Assign failed');
    }
  }

  async function revoke(id: string) {
    if (!confirm('Revoke this executive assignment?')) return;
    try {
      await apiFetch(`/admin/executives/${id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Revoke failed');
    }
  }

  if (loading || !isSuperAdmin) return null;

  return (
    <div>
      <AdminPageHeader
        title="Executives"
        description="Assign executive role by member UUID (from Members list or Supabase)."
      />
      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <form onSubmit={assign} className="mb-8 max-w-lg space-y-3 rounded-xl border p-4 dark:border-zinc-800">
        <input
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="User UUID"
          className="w-full rounded-lg border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          required
        />
        <input
          value={roleTitle}
          onChange={(e) => setRoleTitle(e.target.value)}
          placeholder="Role title (e.g. PRO)"
          className="w-full rounded-lg border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          required
        />
        <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white">
          Assign executive
        </button>
      </form>
      <ul className="space-y-3">
        {list.map((a) => (
          <li
            key={a.id}
            className="flex items-center justify-between rounded-xl border px-4 py-3 dark:border-zinc-800"
          >
            <div>
              <p className="font-medium">
                {a.users?.first_name} {a.users?.last_name} — {a.role_title}
              </p>
              <p className="text-xs text-zinc-500">{a.users?.email}</p>
            </div>
            <button type="button" onClick={() => revoke(a.id)} className="text-sm text-red-600">
              Revoke
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

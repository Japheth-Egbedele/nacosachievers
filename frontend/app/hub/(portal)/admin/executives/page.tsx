'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import { SpinnerCenter } from '@/app/components/Spinner';
import { apiFetch, apiFetchPaginated, ApiClientError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface Member {
  id: string;
  matric_number: string;
  email: string;
  role: string;
  first_name: string;
  last_name: string;
}

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
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [roleByUser, setRoleByUser] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAssignments = () => {
    apiFetch<Assignment[]>('/admin/executives')
      .then(setAssignments)
      .catch(() => setAssignments([]));
  };

  const loadMembers = useCallback(() => {
    const q = search.trim() ? `?search=${encodeURIComponent(search.trim())}&limit=50` : '?limit=50';
    return apiFetchPaginated<Member>(`/admin/members${q}`)
      .then((r) => setMembers(r.items.filter((m) => m.role !== 'super_admin')))
      .catch(() => setMembers([]));
  }, [search]);

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) router.replace('/hub/admin');
  }, [authLoading, isSuperAdmin, router]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    setLoading(true);
    loadAssignments();
    void loadMembers().finally(() => setLoading(false));
  }, [isSuperAdmin, loadMembers]);

  async function assignExecutive(userId: string) {
    const roleTitle = roleByUser[userId]?.trim();
    if (!roleTitle) {
      setError('Enter a role title (e.g. PRO) before assigning');
      return;
    }
    setError('');
    setBusyId(userId);
    try {
      await apiFetch('/admin/executives/assign', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, role_title: roleTitle }),
      });
      setRoleByUser((prev) => ({ ...prev, [userId]: '' }));
      loadAssignments();
      await loadMembers();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Assign failed');
    } finally {
      setBusyId(null);
    }
  }

  async function revokeAssignment(id: string) {
    if (!confirm('Revoke this executive assignment?')) return;
    setError('');
    try {
      await apiFetch(`/admin/executives/${id}`, { method: 'DELETE' });
      loadAssignments();
      await loadMembers();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Revoke failed');
    }
  }

  async function demoteMember(userId: string) {
    if (!confirm('Remove executive role from this member?')) return;
    setBusyId(userId);
    try {
      await apiFetch(`/admin/members/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: 'member' }),
      });
      loadAssignments();
      await loadMembers();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Demote failed');
    } finally {
      setBusyId(null);
    }
  }

  if (authLoading || !isSuperAdmin) return null;
  if (loading) return <SpinnerCenter />;

  return (
    <div>
      <AdminPageHeader
        title="Executives"
        description="Search members by name or ID number, assign a role title, or revoke access."
      />
      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <section className="mb-10">
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Current executives</h2>
        <ul className="mt-3 space-y-2">
          {assignments.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 dark:border-zinc-800"
            >
              <div>
                <p className="font-medium">
                  {a.users?.first_name} {a.users?.last_name} — {a.role_title}
                </p>
                <p className="text-xs text-zinc-500">
                  {a.users?.matric_number} · {a.users?.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => revokeAssignment(a.id)}
                className="text-sm text-red-600 hover:underline"
              >
                Revoke assignment
              </button>
            </li>
          ))}
          {assignments.length === 0 && (
            <li className="text-sm text-zinc-500">No active executive assignments.</li>
          )}
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Promote a member</h2>
        <form
          className="mt-3 mb-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void loadMembers();
          }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, ID number (AU23…), email…"
            className="flex-1 rounded-lg border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white">
            Search
          </button>
        </form>
        <div className="overflow-x-auto rounded-xl border dark:border-zinc-800">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">ID number</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="px-4 py-3">
                    {m.first_name} {m.last_name}
                    <div className="text-xs text-zinc-500">{m.email}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{m.matric_number}</td>
                  <td className="px-4 py-3 capitalize">{m.role}</td>
                  <td className="px-4 py-3">
                    {m.role === 'executive' ? (
                      <button
                        type="button"
                        disabled={busyId === m.id}
                        onClick={() => demoteMember(m.id)}
                        className="text-red-600 hover:underline"
                      >
                        Remove executive
                      </button>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          value={roleByUser[m.id] ?? ''}
                          onChange={(e) =>
                            setRoleByUser((prev) => ({ ...prev, [m.id]: e.target.value }))
                          }
                          placeholder="Role (e.g. PRO)"
                          className="w-32 rounded border px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                        />
                        <button
                          type="button"
                          disabled={busyId === m.id}
                          onClick={() => assignExecutive(m.id)}
                          className="text-emerald-600 hover:underline"
                        >
                          Assign
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {members.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-zinc-500">No members found.</p>
          )}
        </div>
      </section>
    </div>
  );
}

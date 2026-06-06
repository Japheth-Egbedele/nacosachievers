'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import HubAdminSearch from '@/app/hub/components/ui/HubAdminSearch';
import HubAlert from '@/app/hub/components/ui/HubAlert';
import { SpinnerCenter } from '@/app/components/Spinner';
import { hubLink } from '@/lib/hub-styles';
import { apiFetch, apiFetchPaginated, ApiClientError } from '@/lib/api';
import {
  EXECUTIVE_OFFICES,
  officeDisplayTitle,
  type ExecutiveOfficeKey,
} from '@/lib/executive-offices';
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
  office_key?: string | null;
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
  const [officeByUser, setOfficeByUser] = useState<Record<string, ExecutiveOfficeKey | ''>>({});
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
    const officeKey = officeByUser[userId];
    if (!officeKey) {
      setError('Select an executive office before assigning');
      return;
    }
    setError('');
    setBusyId(userId);
    try {
      await apiFetch('/admin/executives/assign', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, office_key: officeKey }),
      });
      setOfficeByUser((prev) => ({ ...prev, [userId]: '' }));
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
        description="Search members by name or ID number, assign an executive office, or revoke access."
      />
      {error && <HubAlert variant="error" className="mb-4">{error}</HubAlert>}

      <section className="mb-10">
        <h2 className="text-sm font-semibold text-[var(--color-hub-text)]">Current executives</h2>
        <ul className="mt-3 space-y-2">
          {assignments.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--color-hub-border)] px-4 py-3"
            >
              <div>
                <p className="font-medium">
                  {a.users?.first_name} {a.users?.last_name} —{' '}
                  {officeDisplayTitle(a.office_key, a.role_title)}
                </p>
                <p className="text-xs text-[var(--color-hub-text-secondary)]">
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
            <li className="text-sm text-[var(--color-hub-text-secondary)]">
              No active executive assignments.
            </li>
          )}
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-[var(--color-hub-text)]">Promote a member</h2>
        <HubAdminSearch
          value={search}
          onChange={setSearch}
          onSubmit={() => void loadMembers()}
          placeholder="Search name, ID number (AU23…), email…"
        />
        <div className="overflow-x-auto rounded-xl border border-[var(--color-hub-border)]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--color-hub-surface-muted)] text-[var(--color-hub-text-secondary)]">
              <tr>
                <th className="px-4 py-3 font-medium">Member</th>
                <th className="px-4 py-3 font-medium">ID number</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-t border-[var(--color-hub-border)]">
                  <td className="px-4 py-3">
                    {m.first_name} {m.last_name}
                    <div className="text-xs text-[var(--color-hub-text-secondary)]">{m.email}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{m.matric_number}</td>
                  <td className="px-4 py-3 capitalize">{m.role.replace('_', ' ')}</td>
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
                        <select
                          value={officeByUser[m.id] ?? ''}
                          onChange={(e) =>
                            setOfficeByUser((prev) => ({
                              ...prev,
                              [m.id]: e.target.value as ExecutiveOfficeKey | '',
                            }))
                          }
                          className="hub-input rounded-lg px-2 py-1 text-xs"
                        >
                          <option value="">— Office —</option>
                          {EXECUTIVE_OFFICES.map((o) => (
                            <option key={o.key} value={o.key}>
                              {o.title}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={busyId === m.id}
                          onClick={() => assignExecutive(m.id)}
                          className={hubLink}
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
            <p className="px-4 py-8 text-center text-sm text-[var(--color-hub-text-secondary)]">
              No members found.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

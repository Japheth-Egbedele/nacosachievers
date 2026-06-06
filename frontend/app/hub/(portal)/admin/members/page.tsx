'use client';

import { useCallback, useEffect, useState } from 'react';
import { SpinnerCenter } from '@/app/components/Spinner';
import HubAdminSearch from '@/app/hub/components/ui/HubAdminSearch';
import HubAlert from '@/app/hub/components/ui/HubAlert';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import { hubLink } from '@/lib/hub-styles';
import { apiFetch, apiFetchPaginated, ApiClientError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface Member {
  id: string;
  matric_number: string;
  email: string;
  role: string;
  level?: string | null;
  first_name: string;
  last_name: string;
  is_email_verified: boolean;
  is_active: boolean;
  academic_status: string;
  can_issue_pins?: boolean;
}

export default function AdminMembersPage() {
  const { isSuperAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<Member[]>([]);
  const [pinFlags, setPinFlags] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    const q = search.trim() ? `?search=${encodeURIComponent(search.trim())}&limit=50` : '?limit=50';
    setLoading(true);
    apiFetchPaginated<Member>(`/admin/members${q}`)
      .then((r) => {
        setItems(r.items);
        const flags: Record<string, boolean> = {};
        for (const m of r.items) {
          flags[m.id] = Boolean(m.can_issue_pins);
        }
        setPinFlags(flags);
      })
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

  async function togglePinIssuer(id: string, next: boolean) {
    setPinFlags((prev) => ({ ...prev, [id]: next }));
    await patchMember(id, { can_issue_pins: next });
  }

  if (loading && items.length === 0) {
    return <SpinnerCenter />;
  }

  return (
    <div>
      <AdminPageHeader
        title="Members"
        description="Search members, toggle active status, or grant PIN issuance rights."
      />
      {error && <HubAlert variant="error" className="mb-4">{error}</HubAlert>}
      <HubAdminSearch
        value={search}
        onChange={setSearch}
        onSubmit={load}
        placeholder="ID number, email, name…"
      />
      <div className="hub-card overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[var(--color-hub-border)] bg-[var(--color-hub-surface-muted)] text-[var(--color-hub-text-secondary)]">
            <tr>
              <th className="px-4 py-3 font-medium">ID number</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Verified</th>
              {isSuperAdmin && <th className="px-4 py-3 font-medium">Issue PINs</th>}
              <th className="px-4 py-3 font-medium">Active</th>
            </tr>
          </thead>
          <tbody>
            {items.map((m) => (
              <tr key={m.id} className="border-t border-[var(--color-hub-border)]">
                <td className="px-4 py-3 font-mono text-xs">{m.matric_number}</td>
                <td className="px-4 py-3">
                  {m.first_name} {m.last_name}
                  <div className="text-xs text-[var(--color-hub-text-secondary)]">{m.email}</div>
                </td>
                <td className="px-4 py-3">
                  <span className="capitalize">{m.role.replace('_', ' ')}</span>
                  {m.role === 'staff' && (
                    <span className="ml-1.5 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800">
                      Staff
                    </span>
                  )}
                  {m.level && m.level !== 'staff' && (
                    <span className="ml-1.5 text-xs text-[var(--color-hub-text-secondary)]">
                      L{m.level}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">{m.is_email_verified ? 'Yes' : 'No'}</td>
                {isSuperAdmin && (
                  <td className="px-4 py-3">
                    <label className="inline-flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={pinFlags[m.id] ?? false}
                        disabled={busyId === m.id || m.role === 'super_admin'}
                        onChange={(e) => void togglePinIssuer(m.id, e.target.checked)}
                        className="h-4 w-4 rounded border-[var(--color-hub-border)] text-[var(--color-brand)]"
                      />
                      <span className="text-xs text-[var(--color-hub-text-secondary)]">
                        Can issue PINs
                      </span>
                    </label>
                  </td>
                )}
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={busyId === m.id}
                    onClick={() => patchMember(m.id, { is_active: !m.is_active })}
                    className={hubLink}
                  >
                    {m.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-[var(--color-hub-text-secondary)]">
            No members found.
          </p>
        )}
      </div>
    </div>
  );
}

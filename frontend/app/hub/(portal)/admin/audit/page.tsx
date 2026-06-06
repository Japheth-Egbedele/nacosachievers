'use client';

import { useCallback, useEffect, useState } from 'react';
import { SpinnerCenter } from '@/app/components/Spinner';
import HubAlert from '@/app/hub/components/ui/HubAlert';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import { apiFetchPaginated } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

type AuditLog = {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
};

export default function AdminAuditPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [items, setItems] = useState<AuditLog[]>([]);
  const [meta, setMeta] = useState<{ total: number; page: number; limit: number } | null>(null);
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    const params = new URLSearchParams({ limit: '50' });
    if (actionFilter.trim()) params.set('action', actionFilter.trim());
    setLoading(true);
    setError('');
    apiFetchPaginated<AuditLog>(`/admin/audit-logs?${params.toString()}`)
      .then((data) => {
        setItems(data.items);
        setMeta(data.meta);
      })
      .catch((err: unknown) => {
        setItems([]);
        setMeta(null);
        setError(err instanceof Error ? err.message : 'Could not load audit log.');
      })
      .finally(() => setLoading(false));
  }, [actionFilter]);

  useEffect(() => {
    if (!authLoading && isAdmin) load();
  }, [authLoading, isAdmin, load]);

  if (authLoading) return <SpinnerCenter label="Loading…" />;

  if (!isAdmin) {
    return <HubAlert variant="error">Audit log is available to executives only.</HubAlert>;
  }

  return (
    <div>
      <AdminPageHeader
        title="Audit log"
        description="Security-sensitive actions such as PIN generation and member permission changes."
      />

      <form
        className="mb-6 flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-600 dark:text-zinc-400">Filter by action</span>
          <input
            type="text"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            placeholder="e.g. pin.generate"
            className="hub-input min-w-[220px]"
          />
        </label>
        <button type="submit" className="hub-btn-primary px-4 py-2 text-sm">
          Apply
        </button>
      </form>

      {error && (
        <HubAlert variant="error" className="mb-4">
          {error}
        </HubAlert>
      )}

      {loading ? (
        <SpinnerCenter label="Loading audit entries…" />
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-500 dark:border-zinc-800">
          No audit entries yet. Run MANUAL_SETUP §2.6.1 if the table is missing.
        </p>
      ) : (
        <>
          {meta && (
            <p className="mb-3 text-xs text-zinc-500">
              Showing {items.length} of {meta.total} entries
            </p>
          )}
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
              <thead className="bg-zinc-50 dark:bg-zinc-950/50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-zinc-600 dark:text-zinc-400">
                    When
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-zinc-600 dark:text-zinc-400">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-zinc-600 dark:text-zinc-400">
                    Entity
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-zinc-600 dark:text-zinc-400">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white dark:divide-zinc-800 dark:bg-zinc-900">
                {items.map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-emerald-700 dark:text-emerald-400">
                      {row.action}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {row.entity_type ?? '—'}
                      {row.entity_id && (
                        <span className="mt-0.5 block font-mono text-[11px] text-zinc-400">
                          {row.entity_id}
                        </span>
                      )}
                    </td>
                    <td className="max-w-md px-4 py-3 text-xs text-zinc-500">
                      {row.metadata && Object.keys(row.metadata).length > 0 ? (
                        <pre className="whitespace-pre-wrap break-all">
                          {JSON.stringify(row.metadata, null, 2)}
                        </pre>
                      ) : (
                        '—'
                      )}
                      {row.ip_address && (
                        <span className="mt-1 block text-zinc-400">IP: {row.ip_address}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

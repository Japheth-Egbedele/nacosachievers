'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SpinnerCenter } from '@/app/components/Spinner';
import HubAdminSearch from '@/app/hub/components/ui/HubAdminSearch';
import HubAlert from '@/app/hub/components/ui/HubAlert';
import HubPillTabs from '@/app/hub/components/ui/HubPillTabs';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import AdminStatTile from '@/app/hub/components/admin/AdminStatTile';
import MemberScopeSelect from '@/app/hub/components/admin/MemberScopeSelect';
import HubPagination from '@/app/hub/components/admin/HubPagination';
import { hubLink } from '@/lib/hub-styles';
import { apiFetch, apiFetchPaginated, ApiClientError, type PaginationMeta } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  buildMembersQuery,
  levelLabel,
  levelTabLabel,
  MEMBER_LEVELS,
  normalizeLevelFilter,
  normalizeMemberScope,
  type LevelFilter,
  type MemberScope,
  type MemberStats,
} from '@/lib/member-stats';

const PAGE_LIMIT = 50;

interface Member {
  id: string;
  matric_number: string;
  email: string;
  role: string;
  level?: string | null;
  year_of_admission?: number | null;
  expected_graduation_year?: number | null;
  first_name: string;
  last_name: string;
  is_email_verified: boolean;
  is_active: boolean;
  academic_status: string;
  can_issue_pins?: boolean;
}

function AdminMembersContent() {
  const { isSuperAdmin } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [scope, setScope] = useState<MemberScope>(() =>
    normalizeMemberScope(searchParams.get('scope')),
  );
  const [level, setLevel] = useState<LevelFilter>(() =>
    normalizeLevelFilter(searchParams.get('level')),
  );
  const [page, setPage] = useState(() => {
    const p = Number(searchParams.get('page'));
    return Number.isFinite(p) && p > 0 ? p : 1;
  });
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '');
  const [items, setItems] = useState<Member[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ total: 0, page: 1, limit: PAGE_LIMIT });
  const [stats, setStats] = useState<MemberStats | null>(null);
  const [pinFlags, setPinFlags] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const syncUrl = useCallback(
    (next: { scope?: MemberScope; level?: LevelFilter; page?: number; q?: string }) => {
      const params = new URLSearchParams();
      params.set('scope', next.scope ?? scope);
      const lvl = next.level ?? level;
      if (lvl !== 'all') params.set('level', lvl);
      const pg = next.page ?? page;
      if (pg > 1) params.set('page', String(pg));
      const q = next.q ?? search;
      if (q.trim()) params.set('q', q.trim());
      const qs = params.toString();
      router.replace(qs ? `/hub/admin/members?${qs}` : '/hub/admin/members', { scroll: false });
    },
    [router, scope, level, page, search],
  );

  const loadStats = useCallback(() => {
    return apiFetch<MemberStats>(`/admin/members/stats?scope=${scope}`)
      .then(setStats)
      .catch(() => setStats(null));
  }, [scope]);

  const loadMembers = useCallback(() => {
    const path = buildMembersQuery({ scope, level, page, limit: PAGE_LIMIT, search });
    setLoading(true);
    return apiFetchPaginated<Member>(`/admin/members${path}`)
      .then((r) => {
        setItems(r.items);
        setMeta(r.meta);
        const flags: Record<string, boolean> = {};
        for (const m of r.items) {
          flags[m.id] = Boolean(m.can_issue_pins);
        }
        setPinFlags(flags);
      })
      .catch(() => {
        setItems([]);
        setMeta({ total: 0, page, limit: PAGE_LIMIT });
      })
      .finally(() => setLoading(false));
  }, [scope, level, page, search]);

  const refresh = useCallback(() => {
    void Promise.all([loadStats(), loadMembers()]);
  }, [loadStats, loadMembers]);

  useEffect(() => {
    setScope(normalizeMemberScope(searchParams.get('scope')));
    setLevel(normalizeLevelFilter(searchParams.get('level')));
    const p = Number(searchParams.get('page'));
    setPage(Number.isFinite(p) && p > 0 ? p : 1);
    setSearch(searchParams.get('q') ?? '');
  }, [searchParams]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const levelTabs = useMemo(() => {
    const allCount = stats?.total;
    return [
      { key: 'all', label: levelTabLabel('all', allCount) },
      ...MEMBER_LEVELS.map((lv) => ({
        key: lv,
        label: levelTabLabel(lv, stats?.by_level[lv]),
      })),
    ];
  }, [stats]);

  const statTiles = useMemo(() => {
    if (!stats) return [];
    const tiles = [
      { label: 'Total', value: String(stats.total) },
      ...MEMBER_LEVELS.map((lv) => ({
        label: levelLabel(lv),
        value: String(stats.by_level[lv]),
      })),
    ];
    if (stats.unassigned > 0) {
      tiles.push({ label: 'Unassigned', value: String(stats.unassigned) });
    }
    return tiles;
  }, [stats]);

  function changeScope(next: MemberScope) {
    setScope(next);
    setPage(1);
    syncUrl({ scope: next, page: 1 });
  }

  function changeLevel(next: LevelFilter) {
    setLevel(next);
    setPage(1);
    syncUrl({ level: next, page: 1 });
  }

  function changePage(next: number) {
    setPage(next);
    syncUrl({ page: next });
  }

  function submitSearch() {
    setPage(1);
    syncUrl({ page: 1, q: search });
    refresh();
  }

  async function patchMember(id: string, patch: Record<string, unknown>) {
    setError('');
    setBusyId(id);
    try {
      await apiFetch(`/admin/members/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      refresh();
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

  if (loading && items.length === 0 && !stats) {
    return <SpinnerCenter />;
  }

  return (
    <div>
      <AdminPageHeader
        title="Members"
        description="Browse by level, filter account scope, search, and manage member status."
      />
      {error && (
        <HubAlert variant="error" className="mb-4">
          {error}
        </HubAlert>
      )}

      <div className="mb-4 space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-hub-muted)]">
          Account scope
        </p>
        <MemberScopeSelect value={scope} onChange={changeScope} />
      </div>

      {statTiles.length > 0 && (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {statTiles.map((t) => (
            <AdminStatTile key={t.label} label={t.label} value={t.value} />
          ))}
        </div>
      )}

      <div className="mb-4">
        <HubPillTabs tabs={levelTabs} active={level} onChange={(k) => changeLevel(k as LevelFilter)} />
      </div>

      <HubAdminSearch
        value={search}
        onChange={setSearch}
        onSubmit={submitSearch}
        placeholder="ID number, email, name…"
      />

      <div className="hub-card overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[var(--color-hub-border)] bg-[var(--color-hub-surface-muted)] text-[var(--color-hub-text-secondary)]">
            <tr>
              <th className="px-4 py-3 font-medium">ID number</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Level</th>
              <th className="px-4 py-3 font-medium">Admission</th>
              <th className="px-4 py-3 font-medium">Expected grad</th>
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
                </td>
                <td className="px-4 py-3 text-[var(--color-hub-text-secondary)]">
                  {m.level === 'staff' ? 'Staff' : m.level ? `L${m.level}` : '—'}
                </td>
                <td className="px-4 py-3 text-[var(--color-hub-text-secondary)]">
                  {m.year_of_admission ?? '—'}
                </td>
                <td className="px-4 py-3 text-[var(--color-hub-text-secondary)]">
                  {m.expected_graduation_year ?? '—'}
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
        {items.length === 0 && !loading && (
          <p className="px-4 py-8 text-center text-sm text-[var(--color-hub-text-secondary)]">
            No members found.
          </p>
        )}
        <HubPagination page={meta.page} limit={meta.limit} total={meta.total} onPageChange={changePage} />
      </div>
    </div>
  );
}

export default function AdminMembersPage() {
  return (
    <Suspense fallback={<SpinnerCenter />}>
      <AdminMembersContent />
    </Suspense>
  );
}

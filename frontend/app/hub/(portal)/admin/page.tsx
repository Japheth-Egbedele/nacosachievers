'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminStatTile from '@/app/hub/components/admin/AdminStatTile';
import MemberScopeSelect from '@/app/hub/components/admin/MemberScopeSelect';
import { apiFetch } from '@/lib/api';
import {
  levelLabel,
  MEMBER_LEVELS,
  readStoredMemberScope,
  storeMemberScope,
  type MemberScope,
  type MemberStats,
} from '@/lib/member-stats';

type Analytics = {
  member_count: number;
  approved_upload_count: number;
  credits_distributed: number;
  active_sessions: number;
};

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Analytics | null>(null);
  const [memberScope, setMemberScope] = useState<MemberScope>('chapter');
  const [memberStats, setMemberStats] = useState<MemberStats | null>(null);

  useEffect(() => {
    setMemberScope(readStoredMemberScope());
    apiFetch<Analytics>('/admin/analytics')
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  useEffect(() => {
    apiFetch<MemberStats>(`/admin/members/stats?scope=${memberScope}`)
      .then(setMemberStats)
      .catch(() => setMemberStats(null));
  }, [memberScope]);

  function changeScope(next: MemberScope) {
    setMemberScope(next);
    storeMemberScope(next);
  }

  const cards = [
    { label: 'Members', value: stats?.member_count ?? '—' },
    { label: 'Approved vault uploads', value: stats?.approved_upload_count ?? '—' },
    { label: 'Credits distributed', value: stats?.credits_distributed ?? '—' },
    { label: 'Active sessions', value: stats?.active_sessions ?? '—' },
  ];

  const levelTiles = useMemo(() => {
    if (!memberStats) return [];
    const tiles = [
      { label: 'Total', value: String(memberStats.total), level: null as string | null },
      ...MEMBER_LEVELS.map((lv) => ({
        label: levelLabel(lv),
        value: String(memberStats.by_level[lv]),
        level: lv,
      })),
    ];
    if (memberStats.unassigned > 0) {
      tiles.push({ label: 'Unassigned', value: String(memberStats.unassigned), level: null });
    }
    return tiles;
  }, [memberStats]);

  return (
    <div>
      <AdminPageHeader
        title="Admin overview"
        description="Chapter operations dashboard. Use the sidebar for members, vault, elections, wallet, and content."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <p className="text-sm text-zinc-500">{c.label}</p>
            <p className="mt-1 text-3xl font-bold text-zinc-900 dark:text-white">{c.value}</p>
          </div>
        ))}
      </div>

      <section className="mt-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-hub-text)]">Members by level</h2>
            <p className="mt-1 text-sm text-[var(--color-hub-text-secondary)]">
              Counts for the selected account scope.{' '}
              <Link href="/hub/admin/members" className="hub-link">
                Open members →
              </Link>
            </p>
          </div>
          <MemberScopeSelect value={memberScope} onChange={changeScope} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {levelTiles.map((t) => (
            <Link
              key={t.label}
              href={
                t.level
                  ? `/hub/admin/members?scope=${memberScope}&level=${t.level}`
                  : `/hub/admin/members?scope=${memberScope}`
              }
              className="block transition hover:opacity-90"
            >
              <AdminStatTile label={t.label} value={t.value} />
            </Link>
          ))}
          {levelTiles.length === 0 && (
            <p className="text-sm text-[var(--color-hub-text-secondary)]">Loading level counts…</p>
          )}
        </div>
      </section>
    </div>
  );
}

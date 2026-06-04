'use client';

import { useEffect, useState } from 'react';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { apiFetch } from '@/lib/api';

type Analytics = {
  member_count: number;
  approved_upload_count: number;
  credits_distributed: number;
  active_sessions: number;
};

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Analytics | null>(null);

  useEffect(() => {
    apiFetch<Analytics>('/admin/analytics')
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  const cards = [
    { label: 'Members', value: stats?.member_count ?? '—' },
    { label: 'Approved vault uploads', value: stats?.approved_upload_count ?? '—' },
    { label: 'Credits distributed', value: stats?.credits_distributed ?? '—' },
    { label: 'Active sessions', value: stats?.active_sessions ?? '—' },
  ];

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
    </div>
  );
}

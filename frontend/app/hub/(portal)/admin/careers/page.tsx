'use client';

import { useEffect, useState } from 'react';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import { apiFetchPaginated, apiFetch, ApiClientError } from '@/lib/api';

interface Posting {
  id: string;
  title: string;
  organization: string;
  status: string;
  created_at: string;
}

export default function AdminCareersPage() {
  const [items, setItems] = useState<Posting[]>([]);
  const [error, setError] = useState('');

  const load = () => {
    apiFetchPaginated<Posting>('/admin/careers/postings?limit=50')
      .then((r) => setItems(r.items))
      .catch(() => setItems([]));
  };

  useEffect(() => {
    load();
  }, []);

  async function verify(id: string, status: 'verified' | 'rejected') {
    setError('');
    try {
      await apiFetch(`/admin/careers/postings/${id}/verify`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed');
    }
  }

  return (
    <div>
      <AdminPageHeader title="Careers" description="Verify or reject member job postings." />
      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <ul className="space-y-3">
        {items.map((p) => (
          <li
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 dark:border-zinc-800"
          >
            <div>
              <p className="font-medium">{p.title}</p>
              <p className="text-xs text-zinc-500">
                {p.organization} · {p.status}
              </p>
            </div>
            {p.status === 'pending_verification' && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => verify(p.id, 'verified')}
                  className="text-sm text-emerald-600"
                >
                  Verify
                </button>
                <button
                  type="button"
                  onClick={() => verify(p.id, 'rejected')}
                  className="text-sm text-red-600"
                >
                  Reject
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

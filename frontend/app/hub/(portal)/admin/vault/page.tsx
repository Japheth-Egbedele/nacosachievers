'use client';

import { useEffect, useState } from 'react';
import { SpinnerCenter } from '@/app/components/Spinner';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import { apiFetch, apiFetchPaginated, ApiClientError } from '@/lib/api';

interface PendingUpload {
  id: string;
  title: string;
  status: string;
  created_at: string;
  users?: { matric_number?: string; display_name?: string };
}

interface Course {
  id: string;
  course_code: string;
  course_name: string;
  level: string;
}

export default function AdminVaultPage() {
  const [tab, setTab] = useState<'pending' | 'courses'>('pending');
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadPending = () => {
    apiFetch<PendingUpload[]>('/vault/pending')
      .then(setPending)
      .catch(() => setPending([]))
      .finally(() => setLoading(false));
  };

  const loadCourses = () => {
    setLoading(true);
    apiFetchPaginated<Course>('/vault/courses?limit=100')
      .then((r) => setCourses(r.items))
      .catch(() => setCourses([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    if (tab === 'pending') loadPending();
    else loadCourses();
  }, [tab]);

  async function review(id: string, status: 'approved' | 'rejected') {
    setError('');
    try {
      await apiFetch(`/vault/uploads/${id}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      loadPending();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Review failed');
    }
  }

  return (
    <div>
      <AdminPageHeader title="Vault" description="Review pending uploads and manage courses." />
      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="mb-4 flex gap-2">
        {(['pending', 'courses'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={
              tab === t
                ? 'rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white'
                : 'rounded-lg border px-3 py-1.5 text-sm dark:border-zinc-700'
            }
          >
            {t === 'pending' ? 'Pending review' : 'Courses'}
          </button>
        ))}
      </div>
      {loading ? (
        <SpinnerCenter />
      ) : (
        <>
      {tab === 'pending' && (
        <ul className="space-y-3">
          {pending.map((u) => (
            <li
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 dark:border-zinc-800"
            >
              <div>
                <p className="font-medium">{u.title}</p>
                <p className="text-xs text-zinc-500">
                  {u.users?.display_name ?? u.users?.matric_number ?? 'Member'} · {u.status}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => review(u.id, 'approved')}
                  className="text-sm text-emerald-600"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => review(u.id, 'rejected')}
                  className="text-sm text-red-600"
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
          {pending.length === 0 && <p className="text-sm text-zinc-500">No pending uploads.</p>}
        </ul>
      )}
      {tab === 'courses' && (
        <>
          <p className="mb-4 text-sm text-zinc-500">
            New courses need department, level, and semester (see MANUAL_SETUP vault schema). List
            below is read-only.
          </p>
          <ul className="space-y-2">
            {courses.map((c) => (
              <li key={c.id} className="rounded-lg border px-4 py-2 text-sm dark:border-zinc-800">
                <span className="font-mono text-xs">{c.course_code}</span> — {c.course_name} (
                {c.level})
              </li>
            ))}
          </ul>
        </>
      )}
        </>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { SpinnerCenter } from '@/app/components/Spinner';
import HubAlert from '@/app/hub/components/ui/HubAlert';
import { HubList, HubListCard, HubListEmpty } from '@/app/hub/components/ui/HubListCard';
import HubPillTabs from '@/app/hub/components/ui/HubPillTabs';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import { hubLink } from '@/lib/hub-styles';
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

const vaultTabs = [
  { key: 'pending', label: 'Pending review' },
  { key: 'courses', label: 'Courses' },
];

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
      {error && <HubAlert variant="error" className="mb-4">{error}</HubAlert>}
      <HubPillTabs
        tabs={vaultTabs}
        active={tab}
        onChange={(k) => setTab(k as 'pending' | 'courses')}
      />
      {loading ? (
        <div className="mt-6">
          <SpinnerCenter />
        </div>
      ) : (
        <>
          {tab === 'pending' && (
            <HubList className="mt-6">
              {pending.length === 0 && (
                <HubListEmpty title="No pending uploads" />
              )}
              {pending.map((u) => (
                <HubListCard key={u.id}>
                  <div>
                    <p className="font-medium">{u.title}</p>
                    <p className="text-xs text-[var(--color-hub-text-secondary)]">
                      {u.users?.display_name ?? u.users?.matric_number ?? 'Member'} · {u.status}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => review(u.id, 'approved')} className={hubLink}>
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => review(u.id, 'rejected')}
                      className="text-sm font-medium text-red-600 hover:underline"
                    >
                      Reject
                    </button>
                  </div>
                </HubListCard>
              ))}
            </HubList>
          )}
          {tab === 'courses' && (
            <>
              <p className="mb-4 mt-6 text-sm text-[var(--color-hub-text-secondary)]">
                New courses need department, level, and semester (see MANUAL_SETUP vault schema).
              </p>
              <HubList>
                {courses.map((c) => (
                  <HubListCard key={c.id} className="block">
                    <span className="font-mono text-xs text-[var(--color-brand)]">{c.course_code}</span>
                    <span className="text-[var(--color-hub-text)]">
                      {' '}
                      — {c.course_name} ({c.level})
                    </span>
                  </HubListCard>
                ))}
              </HubList>
            </>
          )}
        </>
      )}
    </div>
  );
}

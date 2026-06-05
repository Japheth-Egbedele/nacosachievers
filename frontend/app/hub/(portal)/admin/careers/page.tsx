'use client';

import { useEffect, useState } from 'react';
import { SpinnerCenter } from '@/app/components/Spinner';
import HubAlert from '@/app/hub/components/ui/HubAlert';
import { HubList, HubListCard, HubListEmpty } from '@/app/hub/components/ui/HubListCard';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import { hubLink } from '@/lib/hub-styles';
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
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    apiFetchPaginated<Posting>('/admin/careers/postings?limit=50')
      .then((r) => setItems(r.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
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
      {error && <HubAlert variant="error" className="mb-4">{error}</HubAlert>}
      {loading ? (
        <SpinnerCenter />
      ) : (
        <HubList>
          {items.length === 0 && (
            <HubListEmpty title="No postings" description="Member job listings will appear here." />
          )}
          {items.map((p) => (
            <HubListCard key={p.id}>
              <div>
                <p className="font-medium text-[var(--color-hub-text)]">{p.title}</p>
                <p className="mt-0.5 text-xs text-[var(--color-hub-text-secondary)]">
                  {p.organization} · {p.status.replace(/_/g, ' ')}
                </p>
              </div>
              {p.status === 'pending_verification' && (
                <div className="flex gap-3">
                  <button type="button" onClick={() => verify(p.id, 'verified')} className={hubLink}>
                    Verify
                  </button>
                  <button
                    type="button"
                    onClick={() => verify(p.id, 'rejected')}
                    className="text-sm font-medium text-red-600 hover:underline"
                  >
                    Reject
                  </button>
                </div>
              )}
            </HubListCard>
          ))}
        </HubList>
      )}
    </div>
  );
}

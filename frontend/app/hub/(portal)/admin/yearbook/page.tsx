'use client';

import { useEffect, useState } from 'react';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import { SpinnerCenter } from '@/app/components/Spinner';
import HubAlert from '@/app/hub/components/ui/HubAlert';
import { HubList, HubListCard } from '@/app/hub/components/ui/HubListCard';
import { hubBtnPrimary, hubInput, hubLink } from '@/lib/hub-styles';
import { apiFetch, ApiClientError } from '@/lib/api';

interface Edition {
  id: string;
  title: string;
  status: string;
  submissions_open: boolean;
}

const CLASS_TITLE_PATTERN = /^Class of \d{4}\/\d{4}$/i;

export default function AdminYearbookPage() {
  const [editions, setEditions] = useState<Edition[]>([]);
  const [title, setTitle] = useState('');
  const [titleHint, setTitleHint] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    apiFetch<Edition[]>('/admin/yearbook/editions')
      .then(setEditions)
      .catch(() => setEditions([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  function validateTitle(value: string) {
    if (!value.trim()) {
      setTitleHint('');
      return;
    }
    if (!CLASS_TITLE_PATTERN.test(value.trim())) {
      setTitleHint('Suggested format: Class of 2022/2023');
    } else {
      setTitleHint('');
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await apiFetch('/admin/yearbook/editions', {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), submissions_open: true }),
      });
      setTitle('');
      setTitleHint('');
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Create failed');
    }
  }

  async function toggleOpen(id: string, open: boolean) {
    try {
      await apiFetch(`/admin/yearbook/editions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ submissions_open: !open }),
      });
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Update failed');
    }
  }

  if (loading) return <SpinnerCenter />;

  return (
    <div>
      <AdminPageHeader
        title="Yearbook"
        description="Editions use session-style titles (Class of 2022/2023). Student matric numbers follow AU23AY4578 format."
      />
      {error && <HubAlert variant="error" className="mb-4">{error}</HubAlert>}
      <form onSubmit={create} className="mb-6 space-y-2">
        <div className="flex flex-wrap gap-2">
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              validateTitle(e.target.value);
            }}
            onBlur={() => validateTitle(title)}
            placeholder="Class of 2022/2023"
            className={`${hubInput} min-w-[14rem] flex-1`}
            required
          />
          <button type="submit" className={`${hubBtnPrimary} w-auto px-5`}>
            Create edition
          </button>
        </div>
        {titleHint && (
          <p className="text-xs text-[var(--color-brand-gold)]">{titleHint}</p>
        )}
      </form>
      <HubList>
        {editions.map((ed) => (
          <HubListCard key={ed.id}>
            <div>
              <p className="font-medium text-[var(--color-hub-text)]">{ed.title}</p>
              <p className="text-xs text-[var(--color-hub-text-secondary)]">
                {ed.status} · submissions {ed.submissions_open ? 'open' : 'closed'}
              </p>
            </div>
            <button type="button" onClick={() => toggleOpen(ed.id, ed.submissions_open)} className={hubLink}>
              {ed.submissions_open ? 'Close' : 'Open'} submissions
            </button>
          </HubListCard>
        ))}
      </HubList>
    </div>
  );
}

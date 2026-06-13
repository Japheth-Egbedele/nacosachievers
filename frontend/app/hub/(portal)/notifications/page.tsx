'use client';

import { useEffect, useState } from 'react';
import HubPageHeader from '@/app/hub/components/ui/HubPageHeader';
import HubAlert from '@/app/hub/components/ui/HubAlert';
import { hubBtnSecondary, hubLink } from '@/lib/hub-styles';
import { apiFetch, apiFetchPaginated, ApiClientError } from '@/lib/api';

interface NotificationRow {
  id: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [error, setError] = useState('');

  function load() {
    apiFetchPaginated<NotificationRow>('/notifications?limit=50')
      .then((r) => setItems(r.items))
      .catch((err) => {
        setError(err instanceof ApiClientError ? err.message : 'Failed to load notifications');
        setItems([]);
      });
  }

  useEffect(() => {
    load();
  }, []);

  async function markAllRead() {
    setError('');
    try {
      await apiFetch('/notifications/read-all', { method: 'PATCH' });
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Update failed');
    }
  }

  async function markRead(id: string) {
    setError('');
    try {
      await apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Update failed');
    }
  }

  return (
    <div>
      <HubPageHeader
        title="Notifications"
        description="Chapter alerts, wallet activity, and election updates."
      />
      {error && <HubAlert variant="error" className="mb-4">{error}</HubAlert>}
      {items.some((n) => !n.is_read) && (
        <button type="button" onClick={() => void markAllRead()} className={`${hubBtnSecondary} mb-4`}>
          Mark all read
        </button>
      )}
      <ul className="space-y-2">
        {items.map((n) => (
          <li
            key={n.id}
            className={`rounded-xl border px-4 py-3 ${n.is_read ? 'opacity-70' : 'border-emerald-200 bg-emerald-50/50'}`}
          >
            <p className="font-medium">{n.title}</p>
            <p className="mt-1 text-sm text-zinc-600">{n.body}</p>
            <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
              <span>{new Date(n.created_at).toLocaleString()}</span>
              {!n.is_read && (
                <button type="button" onClick={() => void markRead(n.id)} className={hubLink}>
                  Mark read
                </button>
              )}
            </div>
          </li>
        ))}
        {items.length === 0 && !error && (
          <p className="text-sm text-zinc-500">No notifications yet.</p>
        )}
      </ul>
    </div>
  );
}

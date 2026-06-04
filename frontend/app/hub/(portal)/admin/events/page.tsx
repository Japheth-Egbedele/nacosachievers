'use client';

import { useEffect, useState } from 'react';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import { apiFetch, apiFetchPaginated, ApiClientError } from '@/lib/api';

interface EventRow {
  id: string;
  title: string;
  start_datetime: string;
  location?: string;
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [title, setTitle] = useState('');
  const [startAt, setStartAt] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    apiFetchPaginated<EventRow>('/events?limit=50')
      .then((r) => setEvents(r.items))
      .catch(() => setEvents([]));
  };

  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const fd = new FormData();
    fd.append('title', title.trim());
    fd.append('start_datetime', new Date(startAt).toISOString());
    fd.append('status', 'published');
    if (location.trim()) fd.append('location', location.trim());
    try {
      await apiFetch('/admin/events', { method: 'POST', body: fd });
      setTitle('');
      setStartAt('');
      setLocation('');
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Create failed');
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete event?')) return;
    try {
      await apiFetch(`/admin/events/${id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Delete failed');
    }
  }

  return (
    <div>
      <AdminPageHeader title="Events" description="Create and manage chapter events." />
      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <form onSubmit={create} className="mb-8 max-w-lg space-y-3 rounded-xl border p-4 dark:border-zinc-800">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Event title"
          className="w-full rounded-lg border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          required
        />
        <input
          type="datetime-local"
          value={startAt}
          onChange={(e) => setStartAt(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          required
        />
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Location (optional)"
          className="w-full rounded-lg border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white">
          Create event
        </button>
      </form>
      <ul className="space-y-2">
        {events.map((ev) => (
          <li
            key={ev.id}
            className="flex justify-between rounded-xl border px-4 py-3 dark:border-zinc-800"
          >
            <div>
              <p className="font-medium">{ev.title}</p>
              <p className="text-xs text-zinc-500">
                {new Date(ev.start_datetime).toLocaleString()}{' '}
                {ev.location ? `· ${ev.location}` : ''}
              </p>
            </div>
            <button type="button" onClick={() => remove(ev.id)} className="text-sm text-red-600">
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

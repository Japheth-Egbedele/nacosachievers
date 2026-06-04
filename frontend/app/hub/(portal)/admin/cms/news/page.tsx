'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import AdminPageHeader from '../../../../components/admin/AdminPageHeader';
import { apiFetchPaginated, apiFetch, ApiClientError } from '@/lib/api';

interface NewsItem {
  id: string;
  title: string;
  created_at: string;
}

export default function AdminNewsPage() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    apiFetchPaginated<NewsItem>('/news?limit=50')
      .then((r) => setItems(r.items))
      .catch(() => setItems([]));
  };

  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await apiFetch('/admin/news', {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      });
      setTitle('');
      setBody('');
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed');
    }
  }

  return (
    <div>
      <Link href="/hub/admin/cms" className="text-sm text-emerald-600 hover:underline">
        ← CMS
      </Link>
      <AdminPageHeader title="News" description="Short news items for the public site." />
      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <form onSubmit={create} className="mb-6 space-y-3 rounded-xl border p-4 dark:border-zinc-800">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="w-full rounded-lg border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          required
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Body"
          rows={4}
          className="w-full rounded-lg border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          required
        />
        <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white">
          Publish news
        </button>
      </form>
      <ul className="space-y-2 text-sm">
        {items.map((n) => (
          <li key={n.id} className="rounded-lg border px-4 py-2 dark:border-zinc-800">
            {n.title}
          </li>
        ))}
      </ul>
    </div>
  );
}

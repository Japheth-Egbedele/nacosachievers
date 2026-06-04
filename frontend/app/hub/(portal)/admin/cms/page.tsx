'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import { apiFetch, ApiClientError } from '@/lib/api';

const CONTENT_LINKS = [
  { href: '/hub/admin/cms/blog', label: 'Blog posts' },
  { href: '/hub/admin/cms/news', label: 'News' },
  { href: '/hub/admin/cms/gallery', label: 'Gallery' },
  { href: '/hub/admin/cms/faculty', label: 'Faculty' },
  { href: '/hub/admin/cms/announcements', label: 'Announcements' },
];

const SECTION_KEYS = ['hero', 'about', 'contact_office', 'yearbook_teaser'];

export default function AdminCmsPage() {
  const [sectionKey, setSectionKey] = useState('hero');
  const [jsonText, setJsonText] = useState('{}');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiFetch<{ content: Record<string, unknown> }>(`/cms/${sectionKey}`)
      .then((d) => setJsonText(JSON.stringify(d.content ?? {}, null, 2)))
      .catch(() => setJsonText('{}'));
  }, [sectionKey]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaved(false);
    try {
      const content = JSON.parse(jsonText) as Record<string, unknown>;
      await apiFetch(`/cms/${sectionKey}`, {
        method: 'PUT',
        body: JSON.stringify({ content }),
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Save failed');
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="CMS & content"
        description="Edit landing page sections and manage blog, news, gallery, faculty, and announcements."
      />
      <div className="mb-8 grid gap-3 sm:grid-cols-2">
        {CONTENT_LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-xl border border-emerald-200/80 px-4 py-3 text-sm font-medium text-emerald-800 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
          >
            {l.label} →
          </Link>
        ))}
      </div>
      <h2 className="mb-3 text-lg font-semibold">CMS sections</h2>
      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {saved && <p className="mb-4 text-sm text-emerald-600">Section saved.</p>}
      <div className="mb-3 flex flex-wrap gap-2">
        {SECTION_KEYS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setSectionKey(k)}
            className={
              sectionKey === k
                ? 'rounded-lg bg-emerald-600 px-3 py-1 text-sm text-white'
                : 'rounded-lg border px-3 py-1 text-sm dark:border-zinc-700'
            }
          >
            {k}
          </button>
        ))}
      </div>
      <form onSubmit={save}>
        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          rows={12}
          className="w-full font-mono text-xs rounded-xl border p-3 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button type="submit" className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white">
          Save section
        </button>
      </form>
    </div>
  );
}

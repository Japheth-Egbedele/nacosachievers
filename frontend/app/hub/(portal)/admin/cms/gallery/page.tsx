'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import AdminPageHeader from '../../../../components/admin/AdminPageHeader';
import { apiFetchPaginated } from '@/lib/api';

interface Album {
  id: string;
  title?: string;
  created_at: string;
}

export default function AdminGalleryPage() {
  const [items, setItems] = useState<Album[]>([]);

  useEffect(() => {
    apiFetchPaginated<Album>('/gallery?limit=50')
      .then((r) => setItems(r.items))
      .catch(() => setItems([]));
  }, []);

  return (
    <div>
      <Link href="/hub/admin/cms" className="text-sm text-emerald-600 hover:underline">
        ← CMS
      </Link>
      <AdminPageHeader
        title="Gallery"
        description="Public gallery albums. Upload new albums via POST /admin/gallery with multipart image."
      />
      <ul className="space-y-2 text-sm">
        {items.map((a) => (
          <li key={a.id} className="rounded-lg border px-4 py-2 dark:border-zinc-800">
            {a.title ?? 'Untitled'}
          </li>
        ))}
      </ul>
    </div>
  );
}

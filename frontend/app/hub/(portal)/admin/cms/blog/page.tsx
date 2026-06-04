'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import AdminPageHeader from '../../../../components/admin/AdminPageHeader';
import { apiFetchPaginated } from '@/lib/api';

interface Post {
  id: string;
  title: string;
  status: string;
  slug: string;
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    apiFetchPaginated<Post>('/admin/blog?limit=50')
      .then((r) => setPosts(r.items))
      .catch(() => setPosts([]));
  }, []);

  return (
    <div>
      <Link href="/hub/admin/cms" className="text-sm text-emerald-600 hover:underline">
        ← CMS
      </Link>
      <AdminPageHeader
        title="Blog"
        description="List posts from the admin API. Create/edit via API or extend this UI later."
      />
      <ul className="space-y-2 text-sm">
        {posts.map((p) => (
          <li key={p.id} className="rounded-lg border px-4 py-2 dark:border-zinc-800">
            {p.title} <span className="text-zinc-500">({p.status})</span>
          </li>
        ))}
        {posts.length === 0 && <p className="text-zinc-500">No posts yet.</p>}
      </ul>
    </div>
  );
}

import { v4 as uuidv4 } from 'uuid';
import { getSupabase } from '../config/supabase.js';
import { getResend, emailEnv } from '../config/resend.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { parsePagination, buildMeta } from '../utils/pagination.js';
import type { PaginationMeta } from '../utils/response.js';
import { slugify } from '../utils/slug.js';
import * as storageService from './storage.service.js';
import * as settingsService from './settings.service.js';

/**
 * Returns CMS section content by key.
 */
export async function getCmsSection(sectionKey: string): Promise<Record<string, unknown>> {
  const { data, error } = await getSupabase()
    .from('cms_sections')
    .select('section_key, content, updated_at')
    .eq('section_key', sectionKey)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new NotFoundError('Section not found');

  return {
    section_key: data.section_key,
    content: data.content,
    updated_at: data.updated_at,
  };
}

/**
 * Admin: updates CMS section content.
 */
export async function updateCmsSection(
  sectionKey: string,
  content: Record<string, unknown>,
  updatedBy: string,
): Promise<Record<string, unknown>> {
  const { data, error } = await getSupabase()
    .from('cms_sections')
    .upsert(
      {
        section_key: sectionKey,
        content,
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'section_key' },
    )
    .select('section_key, content, updated_at')
    .single();

  if (error) throw error;
  return data;
}

async function uniqueBlogSlug(title: string, excludeId?: string): Promise<string> {
  let base = slugify(title);
  if (!base) base = 'post';
  let slug = base;
  let attempt = 0;

  while (attempt < 20) {
    let query = getSupabase().from('blog_posts').select('id').eq('slug', slug);
    if (excludeId) query = query.neq('id', excludeId);
    const { data } = await query.maybeSingle();
    if (!data) return slug;
    attempt += 1;
    slug = `${base}-${attempt}`;
  }

  return `${base}-${uuidv4().slice(0, 8)}`;
}

/**
 * Lists published blog posts.
 */
export async function listBlogPosts(query: {
  page?: unknown;
  limit?: unknown;
  tag?: string;
  publishedOnly?: boolean;
}): Promise<{ items: unknown[]; meta: PaginationMeta }> {
  const { page, limit, offset } = parsePagination(query);

  let dbQuery = getSupabase()
    .from('blog_posts')
    .select('id, title, slug, excerpt, cover_image_url, status, published_at, tags, created_at', {
      count: 'exact',
    })
    .order('published_at', { ascending: false, nullsFirst: false });

  if (query.publishedOnly !== false) {
    dbQuery = dbQuery.eq('status', 'published');
  }
  if (query.tag) {
    dbQuery = dbQuery.contains('tags', [query.tag]);
  }

  const { data, count, error } = await dbQuery.range(offset, offset + limit - 1);
  if (error) throw error;

  return { items: data ?? [], meta: buildMeta(count ?? 0, page, limit) };
}

/**
 * Returns a blog post by slug.
 */
export async function getBlogPostBySlug(slug: string): Promise<unknown> {
  const { data, error } = await getSupabase()
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new NotFoundError('Post not found');
  return data;
}

/**
 * Admin: creates a blog post.
 */
export async function createBlogPost(
  input: {
    title: string;
    excerpt?: string;
    content?: Record<string, unknown>;
    status?: string;
    tags?: string[];
    authorId: string;
  },
  coverFile?: Express.Multer.File,
): Promise<unknown> {
  const slug = await uniqueBlogSlug(input.title);
  let coverUrl: string | null = null;

  if (coverFile) {
    const ext = coverFile.mimetype.split('/')[1] ?? 'jpg';
    const path = `blog/${uuidv4()}.${ext}`;
    coverUrl = await storageService.uploadFile(
      'public-images',
      path,
      coverFile.buffer,
      coverFile.mimetype,
    );
  }

  const status = input.status ?? 'draft';
  const { data, error } = await getSupabase()
    .from('blog_posts')
    .insert({
      title: input.title,
      slug,
      excerpt: input.excerpt ?? null,
      content: input.content ?? {},
      cover_image_url: coverUrl,
      author_id: input.authorId,
      status,
      published_at: status === 'published' ? new Date().toISOString() : null,
      tags: input.tags ?? [],
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Admin: updates a blog post.
 */
export async function updateBlogPost(
  id: string,
  updates: {
    title?: string;
    excerpt?: string;
    content?: Record<string, unknown>;
    status?: string;
    tags?: string[];
  },
  coverFile?: Express.Multer.File,
): Promise<unknown> {
  const { data: existing } = await getSupabase()
    .from('blog_posts')
    .select('title, slug, cover_image_url, status')
    .eq('id', id)
    .maybeSingle();

  if (!existing) throw new NotFoundError('Post not found');

  const patch: Record<string, unknown> = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  if (updates.title && updates.title !== existing.title) {
    patch.slug = await uniqueBlogSlug(updates.title, id);
  }

  if (updates.status === 'published' && existing.status !== 'published') {
    patch.published_at = new Date().toISOString();
  }

  if (coverFile) {
    const ext = coverFile.mimetype.split('/')[1] ?? 'jpg';
    const path = `blog/${uuidv4()}.${ext}`;
    patch.cover_image_url = await storageService.uploadFile(
      'public-images',
      path,
      coverFile.buffer,
      coverFile.mimetype,
    );
    if (existing.cover_image_url) {
      const oldPath = storageService.extractPathFromUrl(existing.cover_image_url, 'public-images');
      await storageService.deleteFile('public-images', oldPath).catch(() => undefined);
    }
  }

  const { data, error } = await getSupabase()
    .from('blog_posts')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Admin: deletes a blog post and cover image.
 */
export async function deleteBlogPost(id: string): Promise<void> {
  const { data: post } = await getSupabase()
    .from('blog_posts')
    .select('cover_image_url')
    .eq('id', id)
    .maybeSingle();

  if (!post) throw new NotFoundError('Post not found');

  await getSupabase().from('blog_posts').delete().eq('id', id);

  if (post.cover_image_url) {
    const path = storageService.extractPathFromUrl(post.cover_image_url, 'public-images');
    await storageService.deleteFile('public-images', path).catch(() => undefined);
  }
}

/**
 * Lists news items (public).
 */
export async function listNews(query: {
  page?: unknown;
  limit?: unknown;
}): Promise<{ items: unknown[]; meta: PaginationMeta }> {
  const { page, limit, offset } = parsePagination(query);

  const { data, count, error } = await getSupabase()
    .from('news_items')
    .select('*', { count: 'exact' })
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { items: data ?? [], meta: buildMeta(count ?? 0, page, limit) };
}

/**
 * Returns a news item by id.
 */
export async function getNewsItem(id: string): Promise<unknown> {
  const { data, error } = await getSupabase()
    .from('news_items')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new NotFoundError('News item not found');
  return data;
}

/**
 * Admin: creates a news item.
 */
export async function createNewsItem(
  input: { title: string; body: string; createdBy: string },
  imageFile?: Express.Multer.File,
): Promise<unknown> {
  let imageUrl: string | null = null;
  if (imageFile) {
    const ext = imageFile.mimetype.split('/')[1] ?? 'jpg';
    const path = `news/${uuidv4()}.${ext}`;
    imageUrl = await storageService.uploadFile(
      'public-images',
      path,
      imageFile.buffer,
      imageFile.mimetype,
    );
  }

  const { data, error } = await getSupabase()
    .from('news_items')
    .insert({
      title: input.title,
      body: input.body,
      image_url: imageUrl,
      created_by: input.createdBy,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Admin: updates a news item.
 */
export async function updateNewsItem(
  id: string,
  updates: { title?: string; body?: string },
  imageFile?: Express.Multer.File,
): Promise<unknown> {
  const { data: existing } = await getSupabase()
    .from('news_items')
    .select('image_url')
    .eq('id', id)
    .maybeSingle();

  if (!existing) throw new NotFoundError('News item not found');

  const patch: Record<string, unknown> = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  if (imageFile) {
    const ext = imageFile.mimetype.split('/')[1] ?? 'jpg';
    const path = `news/${uuidv4()}.${ext}`;
    patch.image_url = await storageService.uploadFile(
      'public-images',
      path,
      imageFile.buffer,
      imageFile.mimetype,
    );
    if (existing.image_url) {
      const oldPath = storageService.extractPathFromUrl(existing.image_url, 'public-images');
      await storageService.deleteFile('public-images', oldPath).catch(() => undefined);
    }
  }

  const { data, error } = await getSupabase()
    .from('news_items')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Admin: deletes a news item.
 */
export async function deleteNewsItem(id: string): Promise<void> {
  const { data: item } = await getSupabase()
    .from('news_items')
    .select('image_url')
    .eq('id', id)
    .maybeSingle();

  if (!item) throw new NotFoundError('News item not found');

  await getSupabase().from('news_items').delete().eq('id', id);

  if (item.image_url) {
    const path = storageService.extractPathFromUrl(item.image_url, 'public-images');
    await storageService.deleteFile('public-images', path).catch(() => undefined);
  }
}

/**
 * Lists gallery items.
 */
export async function listGallery(): Promise<unknown[]> {
  const { data, error } = await getSupabase()
    .from('gallery_items')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * Admin: uploads a gallery image.
 */
export async function createGalleryItem(
  input: { title?: string; event_id?: string | null; tags?: string[]; uploadedBy: string },
  imageFile: Express.Multer.File,
): Promise<unknown> {
  const ext = imageFile.mimetype.split('/')[1] ?? 'jpg';
  const path = `gallery/${uuidv4()}.${ext}`;
  const imageUrl = await storageService.uploadFile(
    'public-images',
    path,
    imageFile.buffer,
    imageFile.mimetype,
  );

  const { data, error } = await getSupabase()
    .from('gallery_items')
    .insert({
      title: input.title ?? null,
      image_url: imageUrl,
      event_id: input.event_id ?? null,
      tags: input.tags ?? [],
      uploaded_by: input.uploadedBy,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Admin: deletes a gallery item and storage file.
 */
export async function deleteGalleryItem(id: string): Promise<void> {
  const { data: item } = await getSupabase()
    .from('gallery_items')
    .select('image_url')
    .eq('id', id)
    .maybeSingle();

  if (!item) throw new NotFoundError('Gallery item not found');

  await getSupabase().from('gallery_items').delete().eq('id', id);

  const path = storageService.extractPathFromUrl(item.image_url, 'public-images');
  await storageService.deleteFile('public-images', path).catch(() => undefined);
}

/**
 * Lists active faculty/staff.
 */
export async function listFaculty(): Promise<unknown[]> {
  const { data, error } = await getSupabase()
    .from('faculty_staff')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Admin: lists all faculty/staff.
 */
export async function listFacultyAdmin(): Promise<unknown[]> {
  const { data, error } = await getSupabase()
    .from('faculty_staff')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Admin: creates faculty/staff entry.
 */
export async function createFaculty(
  input: Record<string, unknown>,
  photoFile?: Express.Multer.File,
): Promise<unknown> {
  let photoUrl: string | null = null;
  if (photoFile) {
    const ext = photoFile.mimetype.split('/')[1] ?? 'jpg';
    const path = `faculty/${uuidv4()}.${ext}`;
    photoUrl = await storageService.uploadFile(
      'public-images',
      path,
      photoFile.buffer,
      photoFile.mimetype,
    );
  }

  const { data, error } = await getSupabase()
    .from('faculty_staff')
    .insert({ ...input, photo_url: photoUrl })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Admin: updates faculty/staff entry.
 */
export async function updateFaculty(
  id: string,
  updates: Record<string, unknown>,
  photoFile?: Express.Multer.File,
): Promise<unknown> {
  const { data: existing } = await getSupabase()
    .from('faculty_staff')
    .select('photo_url')
    .eq('id', id)
    .maybeSingle();

  if (!existing) throw new NotFoundError('Faculty member not found');

  const patch: Record<string, unknown> = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  if (photoFile) {
    const ext = photoFile.mimetype.split('/')[1] ?? 'jpg';
    const path = `faculty/${uuidv4()}.${ext}`;
    patch.photo_url = await storageService.uploadFile(
      'public-images',
      path,
      photoFile.buffer,
      photoFile.mimetype,
    );
    if (existing.photo_url) {
      const oldPath = storageService.extractPathFromUrl(existing.photo_url, 'public-images');
      await storageService.deleteFile('public-images', oldPath).catch(() => undefined);
    }
  }

  const { data, error } = await getSupabase()
    .from('faculty_staff')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Admin: deletes faculty/staff entry.
 */
export async function deleteFaculty(id: string): Promise<void> {
  const { data: row } = await getSupabase()
    .from('faculty_staff')
    .select('photo_url')
    .eq('id', id)
    .maybeSingle();

  if (!row) throw new NotFoundError('Faculty member not found');

  await getSupabase().from('faculty_staff').delete().eq('id', id);

  if (row.photo_url) {
    const path = storageService.extractPathFromUrl(row.photo_url, 'public-images');
    await storageService.deleteFile('public-images', path).catch(() => undefined);
  }
}

/**
 * Lists active announcements for the given audience.
 */
export async function listAnnouncements(audience: 'public' | 'member'): Promise<unknown[]> {
  const now = new Date().toISOString();

  let dbQuery = getSupabase()
    .from('announcements')
    .select('*')
    .eq('is_active', true)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('created_at', { ascending: false });

  if (audience === 'public') {
    dbQuery = dbQuery.in('target', ['public', 'all']);
  } else {
    dbQuery = dbQuery.in('target', ['members', 'all']);
  }

  const { data, error } = await dbQuery;
  if (error) throw error;
  return data ?? [];
}

/**
 * Admin: lists all announcements.
 */
export async function listAnnouncementsAdmin(): Promise<unknown[]> {
  const { data, error } = await getSupabase()
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * Admin: creates an announcement.
 */
export async function createAnnouncement(
  input: Record<string, unknown>,
  createdBy: string,
): Promise<unknown> {
  const { data, error } = await getSupabase()
    .from('announcements')
    .insert({ ...input, created_by: createdBy })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Admin: updates an announcement.
 */
export async function updateAnnouncement(
  id: string,
  updates: Record<string, unknown>,
): Promise<unknown> {
  const { data, error } = await getSupabase()
    .from('announcements')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  if (!data) throw new NotFoundError('Announcement not found');
  return data;
}

/**
 * Admin: deletes an announcement.
 */
export async function deleteAnnouncement(id: string): Promise<void> {
  const { data } = await getSupabase().from('announcements').delete().eq('id', id).select('id');
  if (!data?.length) throw new NotFoundError('Announcement not found');
}

/**
 * Subscribes an email to the newsletter.
 */
export async function subscribe(email: string): Promise<void> {
  const { error } = await getSupabase().from('newsletter_subscribers').upsert(
    { email: email.toLowerCase(), is_active: true, subscribed_at: new Date().toISOString() },
    { onConflict: 'email' },
  );

  if (error) throw error;
}

/**
 * Admin: exports newsletter subscribers as CSV.
 */
export async function exportSubscribersCsv(): Promise<string> {
  const { data, error } = await getSupabase()
    .from('newsletter_subscribers')
    .select('email, subscribed_at, is_active')
    .eq('is_active', true)
    .order('subscribed_at', { ascending: true });

  if (error) throw error;

  const header = 'email,subscribed_at';
  const rows = (data ?? []).map((row) => `"${row.email}","${row.subscribed_at}"`);
  return [header, ...rows].join('\n');
}

/**
 * Sends contact form email via Resend.
 */
export async function sendContactMessage(input: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<void> {
  const settings = await settingsService.getAllSettings();
  const contactEmail = String(settings.contact_email ?? '').replace(/^"|"$/g, '');

  if (!contactEmail) {
    throw new ValidationError('Contact email is not configured');
  }

  await getResend().emails.send({
    from: emailEnv.RESEND_FROM_EMAIL,
    to: contactEmail,
    replyTo: input.email,
    subject: `[NACOS Contact] ${input.subject}`,
    html: `<p><strong>From:</strong> ${input.name} &lt;${input.email}&gt;</p><p>${input.message}</p>`,
  });
}

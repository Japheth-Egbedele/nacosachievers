import { z } from 'zod';

export const cmsSectionKeySchema = z.object({
  sectionKey: z.string().min(1).max(100),
});

export const updateCmsSectionSchema = z.object({
  content: z.record(z.unknown()),
});

export const blogQuerySchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  tag: z.string().optional(),
});

export const createBlogSchema = z.object({
  title: z.string().min(1).max(300),
  excerpt: z.string().max(1000).optional(),
  content: z.record(z.unknown()).optional(),
  status: z.enum(['draft', 'published']).optional(),
  tags: z.array(z.string()).optional(),
});

export const updateBlogSchema = createBlogSchema.partial();

export const createNewsSchema = z.object({
  title: z.string().min(1).max(300),
  body: z.string().min(1),
});

export const updateNewsSchema = createNewsSchema.partial();

export const createGallerySchema = z.object({
  title: z.string().max(300).optional(),
  event_id: z.string().uuid().optional().nullable(),
  tags: z.array(z.string()).optional(),
});

export const createFacultySchema = z.object({
  name: z.string().min(1).max(200),
  position: z.string().min(1).max(200),
  role_category: z.string().max(100).optional(),
  bio: z.string().max(5000).optional(),
  email: z.string().email().optional().nullable(),
  department_id: z.string().uuid().optional().nullable(),
  display_order: z.coerce.number().int().optional(),
  is_active: z.boolean().optional(),
});

export const updateFacultySchema = createFacultySchema.partial();

export const createAnnouncementSchema = z.object({
  title: z.string().min(1).max(300),
  body: z.string().min(1),
  is_active: z.boolean().optional(),
  target: z.enum(['public', 'members', 'all']).optional(),
  expires_at: z.string().datetime().optional().nullable(),
});

export const updateAnnouncementSchema = createAnnouncementSchema.partial();

export const subscribeSchema = z.object({
  email: z.string().email(),
});

export const contactSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  subject: z.string().min(1).max(300),
  message: z.string().min(10).max(5000),
});

import { z } from 'zod';

export const updateMeSchema = z.object({
  display_name: z.string().min(1).max(128).optional(),
  bio: z.string().max(2000).optional(),
  linkedin_url: z.string().url().nullable().optional(),
  github_url: z.string().url().nullable().optional(),
  email_visible: z.boolean().optional(),
  notification_prefs: z.record(z.unknown()).optional(),
});

export const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8).max(128),
});

export const alumniQuerySchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  graduation_year: z.coerce.number().optional(),
  level: z.enum(['100', '200', '300', '400', 'staff']).optional(),
});

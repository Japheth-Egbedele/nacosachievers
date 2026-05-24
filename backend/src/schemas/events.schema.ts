import { z } from 'zod';

export const eventsQuerySchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  filter: z.enum(['upcoming', 'past']).optional(),
});

export const createEventSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(10000).optional(),
  start_datetime: z.string().datetime(),
  end_datetime: z.string().datetime().optional().nullable(),
  location: z.string().max(500).optional().nullable(),
  is_online: z.boolean().optional(),
  meeting_link: z.string().url().optional().nullable(),
  rsvp_limit: z.coerce.number().int().positive().optional().nullable(),
  status: z.enum(['draft', 'published', 'cancelled']).optional(),
});

export const updateEventSchema = createEventSchema.partial();

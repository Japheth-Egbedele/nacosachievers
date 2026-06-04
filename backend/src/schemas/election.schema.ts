import { z } from 'zod';

export const castVoteSchema = z.object({
  candidate_ids: z.array(z.string().uuid()).min(1),
});

export const createElectionSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  kind: z.enum(['executive', 'custom']).optional(),
  scope: z.enum(['chapter', 'department']).optional(),
  department_id: z.string().uuid().optional(),
  require_all_positions: z.boolean().optional(),
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
});

export const updateElectionSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  require_all_positions: z.boolean().optional(),
});

export const createPositionSchema = z.object({
  title: z.string().min(1).max(200),
  sort_order: z.coerce.number().int().nonnegative().optional(),
});

export const updatePositionSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  sort_order: z.coerce.number().int().nonnegative().optional(),
});

export const createCandidateSchema = z.object({
  position_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  manifesto: z.string().max(5000).optional(),
  image_url: z.string().url().optional().or(z.literal('')),
});

export const updateCandidateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  manifesto: z.string().max(5000).optional(),
  image_url: z.string().url().optional().or(z.literal('')),
});

export const electionListQuerySchema = z.object({
  status: z.enum(['active', 'upcoming', 'completed']).optional(),
});

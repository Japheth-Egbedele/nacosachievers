import { z } from 'zod';
import { WORK_MODES, CAREER_POSTING_STATUSES } from '../constants/enums.js';

export const careerListQuerySchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  work_mode: z.enum(WORK_MODES).optional(),
  location: z.string().optional(),
});

export const submitCareerSchema = z.object({
  title: z.string().min(3).max(200),
  organization: z.string().min(1).max(200),
  description: z.string().min(20).max(10000),
  application_url: z.string().url(),
  location: z.string().max(200).optional(),
  work_mode: z.enum(WORK_MODES).default('onsite'),
  expires_at: z.string().datetime().optional(),
});

export const adminCareersQuerySchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  status: z.enum(CAREER_POSTING_STATUSES).optional(),
});

export const verifyCareerSchema = z.object({
  status: z.enum(['verified', 'rejected']),
  reason: z.string().max(1000).optional(),
});

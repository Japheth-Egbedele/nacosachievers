import { z } from 'zod';
import { USER_ROLES, USER_LEVELS, ACADEMIC_STATUSES } from '../constants/enums.js';

export const membersQuerySchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  search: z.string().optional(),
  role: z.enum(USER_ROLES).optional(),
  level: z.enum(USER_LEVELS).optional(),
  status: z.enum(ACADEMIC_STATUSES).optional(),
  is_active: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

export const patchMemberSchema = z.object({
  role: z.enum(USER_ROLES).optional(),
  is_active: z.boolean().optional(),
  academic_status: z.enum(ACADEMIC_STATUSES).optional(),
});

export const assignExecutiveSchema = z.object({
  user_id: z.string().uuid(),
  session_id: z.string().uuid().optional(),
  role_title: z.string().min(1).max(128),
});

export const updateSettingsSchema = z.record(z.unknown());

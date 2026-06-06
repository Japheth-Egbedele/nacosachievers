import { z } from 'zod';
import { USER_ROLES, USER_LEVELS, ACADEMIC_STATUSES } from '../constants/enums.js';
import { ADMIN_SCOPES } from '../constants/admin-scopes.js';
import { EXECUTIVE_OFFICES } from '../constants/executive-offices.js';

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
  can_issue_pins: z.boolean().optional(),
  level: z.enum(USER_LEVELS).optional(),
  year_of_admission: z.coerce.number().int().min(1990).max(2100).optional(),
  expected_graduation_year: z.coerce.number().int().min(1990).max(2100).optional(),
  actual_graduation_year: z.coerce.number().int().min(1990).max(2100).optional(),
  admin_scopes: z.array(z.enum(ADMIN_SCOPES)).optional(),
});

const officeKeys = EXECUTIVE_OFFICES.map((o) => o.key) as [string, ...string[]];

export const assignExecutiveSchema = z
  .object({
    user_id: z.string().uuid(),
    session_id: z.string().uuid().optional(),
    office_key: z.enum(officeKeys).optional(),
    role_title: z.string().min(1).max(128).optional(),
  })
  .refine((v) => Boolean(v.office_key || v.role_title), {
    message: 'office_key or role_title is required',
  });

export const updateSettingsSchema = z.record(z.unknown());

export const userLookupQuerySchema = z.object({
  search: z.string().min(1),
  limit: z.coerce.number().optional(),
});

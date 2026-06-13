import { Router } from 'express';
import { z } from 'zod';
import { catchAsync } from '../utils/catch-async.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireActiveUser } from '../middleware/require-active-user.js';
import { requireAdminScope } from '../middleware/require-admin-scope.js';
import { requireExecutive } from '../middleware/role-guard.js';
import { YB_EDITION_STATUSES } from '../constants/enums.js';
import * as adminYearbookController from '../controllers/admin-yearbook.controller.js';

const createEditionSchema = z.object({
  title: z.string().min(1).max(200),
  session_id: z.string().uuid().optional(),
  submissions_open: z.boolean().optional(),
  cohort_alumni_unlocked_at: z.string().datetime().optional(),
});

const updateEditionSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  session_id: z.string().uuid().nullable().optional(),
  submissions_open: z.boolean().optional(),
  cohort_alumni_unlocked_at: z.string().datetime().nullable().optional(),
  status: z.enum(YB_EDITION_STATUSES).optional(),
});

const patchSlotSchema = z.object({
  display_name: z.string().max(128).optional(),
  portrait_url: z.string().nullable().optional(),
  quote: z.string().max(500).nullable().optional(),
  include_in_yearbook: z.boolean().optional(),
  sort_key: z.number().int().optional(),
  admin_notes: z.string().max(1000).nullable().optional(),
});

const router = Router();

router.use(
  authMiddleware,
  catchAsync(requireActiveUser),
  requireExecutive,
  requireAdminScope('yearbook'),
);

router.get('/editions', catchAsync(adminYearbookController.listEditions));
router.post(
  '/editions',
  validate(createEditionSchema),
  catchAsync(adminYearbookController.createEdition),
);
router.patch(
  '/editions/:id',
  validate(updateEditionSchema),
  catchAsync(adminYearbookController.updateEdition),
);
router.get('/editions/:id/slots', catchAsync(adminYearbookController.listSlots));
router.post('/editions/:id/rebuild-pdf', catchAsync(adminYearbookController.rebuildPdf));
router.patch(
  '/editions/:id/slots/:userId',
  validate(patchSlotSchema),
  catchAsync(adminYearbookController.patchSlot),
);

export default router;

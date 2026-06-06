import { Router } from 'express';
import { catchAsync } from '../utils/catch-async.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireExecutive, requireSuperAdmin } from '../middleware/role-guard.js';
import {
  assignExecutiveSchema,
  membersQuerySchema,
  patchMemberSchema,
  updateSettingsSchema,
  userLookupQuerySchema,
} from '../schemas/admin.schema.js';
import * as adminController from '../controllers/admin.controller.js';

const router = Router();

router.use(authMiddleware, requireExecutive);

router.get('/members', validate(membersQuerySchema, 'query'), catchAsync(adminController.listMembers));
router.get('/users/lookup', validate(userLookupQuerySchema, 'query'), catchAsync(adminController.lookupUsers));
router.get('/members/:id', catchAsync(adminController.getMember));
router.patch('/members/:id', validate(patchMemberSchema), catchAsync(adminController.patchMember));
router.get('/analytics', catchAsync(adminController.getAnalytics));
router.get('/executives', catchAsync(adminController.listExecutives));
router.get('/audit-logs', catchAsync(adminController.listAuditLogs));

router.get(
  '/session/promote/preview',
  requireSuperAdmin,
  catchAsync(adminController.previewSessionPromotion),
);
router.post(
  '/session/promote',
  requireSuperAdmin,
  catchAsync(adminController.applySessionPromotion),
);
router.get(
  '/session/graduate/preview',
  requireSuperAdmin,
  catchAsync(adminController.previewGraduateCohort),
);
router.post(
  '/session/graduate',
  requireSuperAdmin,
  catchAsync(adminController.applyGraduateCohort),
);

router.post(
  '/executives/assign',
  requireSuperAdmin,
  validate(assignExecutiveSchema),
  catchAsync(adminController.assignExecutive),
);
router.delete(
  '/executives/:assignmentId',
  requireSuperAdmin,
  catchAsync(adminController.revokeExecutive),
);

router.get('/settings', catchAsync(adminController.getSettings));
router.patch(
  '/settings',
  requireSuperAdmin,
  validate(updateSettingsSchema),
  catchAsync(adminController.patchSettings),
);

export default router;

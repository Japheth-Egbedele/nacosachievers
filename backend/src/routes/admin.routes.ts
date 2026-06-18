import { Router } from 'express';
import { catchAsync } from '../utils/catch-async.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireActiveUser } from '../middleware/require-active-user.js';
import { requireAdminScope } from '../middleware/require-admin-scope.js';
import { requireExecutive, requireSuperAdmin } from '../middleware/role-guard.js';
import {
  assignExecutiveSchema,
  correctMemberEmailSchema,
  membersQuerySchema,
  memberStatsQuerySchema,
  patchMemberSchema,
  updateSettingsSchema,
  userLookupQuerySchema,
} from '../schemas/admin.schema.js';
import * as adminController from '../controllers/admin.controller.js';

const router = Router();

router.use(authMiddleware, catchAsync(requireActiveUser), requireExecutive);

const membersScope = requireAdminScope('members');
const auditScope = requireAdminScope('audit');

router.get(
  '/members',
  membersScope,
  validate(membersQuerySchema, 'query'),
  catchAsync(adminController.listMembers),
);
router.get(
  '/members/stats',
  membersScope,
  validate(memberStatsQuerySchema, 'query'),
  catchAsync(adminController.getMemberStats),
);
router.get(
  '/users/lookup',
  membersScope,
  validate(userLookupQuerySchema, 'query'),
  catchAsync(adminController.lookupUsers),
);
router.get('/members/:id', membersScope, catchAsync(adminController.getMember));
router.patch(
  '/members/:id',
  membersScope,
  validate(patchMemberSchema),
  catchAsync(adminController.patchMember),
);
router.post(
  '/members/:id/correct-email',
  membersScope,
  validate(correctMemberEmailSchema),
  catchAsync(adminController.correctMemberEmail),
);
router.post(
  '/members/:id/resend-verification',
  membersScope,
  catchAsync(adminController.resendMemberVerification),
);
router.get('/analytics', membersScope, catchAsync(adminController.getAnalytics));
router.get('/executives', membersScope, catchAsync(adminController.listExecutives));
router.get('/audit-logs', auditScope, catchAsync(adminController.listAuditLogs));

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
router.post(
  '/executives/sync-scopes',
  requireSuperAdmin,
  catchAsync(adminController.syncExecutiveScopes),
);

router.get('/settings', requireSuperAdmin, catchAsync(adminController.getSettings));
router.patch(
  '/settings',
  requireSuperAdmin,
  validate(updateSettingsSchema),
  catchAsync(adminController.patchSettings),
);

export default router;

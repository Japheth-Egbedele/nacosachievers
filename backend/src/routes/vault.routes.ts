import { Router } from 'express';
import { catchAsync } from '../utils/catch-async.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireActiveUser } from '../middleware/require-active-user.js';
import { requireAdminScope } from '../middleware/require-admin-scope.js';
import { requireExecutive } from '../middleware/role-guard.js';
import { uploadRateLimiter } from '../middleware/rate-limiter.js';
import { requireMemberPortal } from '../middleware/require-member-portal.js';
import { pdfUpload } from '../middleware/upload.middleware.js';
import { validate } from '../middleware/validate.js';
import { bulkApproveSchema, bulkDeleteSchema } from '../schemas/vault.schema.js';
import * as vaultController from '../controllers/vault.controller.js';

const router = Router();
const vaultScope = requireAdminScope('vault');

router.get('/upload-limits', authMiddleware, catchAsync(requireActiveUser), requireMemberPortal, catchAsync(vaultController.getUploadLimits));
router.get('/uploads/duplicate-check', authMiddleware, catchAsync(requireActiveUser), requireMemberPortal, catchAsync(vaultController.checkDuplicate));

router.get('/courses', authMiddleware, catchAsync(requireActiveUser), requireMemberPortal, catchAsync(vaultController.listCourses));
router.get('/courses/:id', authMiddleware, catchAsync(requireActiveUser), requireMemberPortal, catchAsync(vaultController.getCourse));

router.post(
  '/courses',
  authMiddleware,
  catchAsync(requireActiveUser),
  requireExecutive,
  vaultScope,
  catchAsync(vaultController.createCourse),
);
router.patch(
  '/courses/:id',
  authMiddleware,
  catchAsync(requireActiveUser),
  requireExecutive,
  vaultScope,
  catchAsync(vaultController.updateCourse),
);
router.delete(
  '/courses/:id',
  authMiddleware,
  catchAsync(requireActiveUser),
  requireExecutive,
  vaultScope,
  catchAsync(vaultController.deleteCourse),
);

router.post(
  '/uploads/init',
  authMiddleware,
  catchAsync(requireActiveUser),
  requireMemberPortal,
  uploadRateLimiter,
  catchAsync(vaultController.initUpload),
);
router.post(
  '/uploads/:id/complete',
  authMiddleware,
  catchAsync(requireActiveUser),
  requireMemberPortal,
  catchAsync(vaultController.completeUpload),
);
router.post(
  '/uploads',
  authMiddleware,
  catchAsync(requireActiveUser),
  requireMemberPortal,
  uploadRateLimiter,
  pdfUpload.single('file'),
  catchAsync(vaultController.uploadFile),
);
router.get('/uploads', authMiddleware, catchAsync(requireActiveUser), requireMemberPortal, catchAsync(vaultController.listUploads));
router.get('/uploads/mine', authMiddleware, catchAsync(requireActiveUser), requireMemberPortal, catchAsync(vaultController.listMyUploads));
router.get('/uploads/:id/files', authMiddleware, catchAsync(requireActiveUser), requireMemberPortal, catchAsync(vaultController.listUploadFiles));
router.get('/uploads/:id/download', authMiddleware, catchAsync(requireActiveUser), requireMemberPortal, catchAsync(vaultController.downloadUpload));
router.delete('/uploads/:id', authMiddleware, catchAsync(requireActiveUser), requireMemberPortal, catchAsync(vaultController.deleteUpload));

router.get('/pending', authMiddleware, catchAsync(requireActiveUser), requireExecutive, vaultScope, catchAsync(vaultController.listPending));
router.get('/treasury-summary', authMiddleware, catchAsync(requireActiveUser), requireExecutive, vaultScope, catchAsync(vaultController.getTreasurySummary));
router.get(
  '/uploads/:id/preview',
  authMiddleware,
  catchAsync(requireActiveUser),
  requireExecutive,
  vaultScope,
  catchAsync(vaultController.previewUpload),
);
router.post(
  '/uploads/bulk-approve',
  authMiddleware,
  catchAsync(requireActiveUser),
  requireExecutive,
  vaultScope,
  validate(bulkApproveSchema),
  catchAsync(vaultController.bulkApproveUploads),
);
router.post(
  '/uploads/bulk-delete',
  authMiddleware,
  catchAsync(requireActiveUser),
  requireExecutive,
  vaultScope,
  validate(bulkDeleteSchema),
  catchAsync(vaultController.bulkDeleteUploads),
);
router.patch(
  '/uploads/:id/review',
  authMiddleware,
  catchAsync(requireActiveUser),
  requireExecutive,
  vaultScope,
  catchAsync(vaultController.reviewUpload),
);
router.post('/uploads/:id/flag', authMiddleware, catchAsync(requireActiveUser), requireMemberPortal, catchAsync(vaultController.flagUpload));
router.get('/flags', authMiddleware, catchAsync(requireActiveUser), requireExecutive, vaultScope, catchAsync(vaultController.listFlags));
router.patch(
  '/flags/:id/resolve',
  authMiddleware,
  catchAsync(requireActiveUser),
  requireExecutive,
  vaultScope,
  catchAsync(vaultController.resolveFlag),
);

export default router;

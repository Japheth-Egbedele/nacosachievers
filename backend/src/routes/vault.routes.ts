import { Router } from 'express';
import { catchAsync } from '../utils/catch-async.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireExecutive } from '../middleware/role-guard.js';
import { uploadRateLimiter } from '../middleware/rate-limiter.js';
import { pdfUpload } from '../middleware/upload.middleware.js';
import * as vaultController from '../controllers/vault.controller.js';

const router = Router();

router.get('/courses', authMiddleware, catchAsync(vaultController.listCourses));
router.get('/courses/:id', authMiddleware, catchAsync(vaultController.getCourse));

router.post(
  '/courses',
  authMiddleware,
  requireExecutive,
  catchAsync(vaultController.createCourse),
);
router.patch(
  '/courses/:id',
  authMiddleware,
  requireExecutive,
  catchAsync(vaultController.updateCourse),
);
router.delete(
  '/courses/:id',
  authMiddleware,
  requireExecutive,
  catchAsync(vaultController.deleteCourse),
);

router.post(
  '/uploads',
  authMiddleware,
  uploadRateLimiter,
  pdfUpload.single('file'),
  catchAsync(vaultController.uploadFile),
);
router.get('/uploads', authMiddleware, catchAsync(vaultController.listUploads));
router.get('/uploads/mine', authMiddleware, catchAsync(vaultController.listMyUploads));
router.get('/uploads/:id/download', authMiddleware, catchAsync(vaultController.downloadUpload));
router.delete('/uploads/:id', authMiddleware, catchAsync(vaultController.deleteUpload));

router.get('/pending', authMiddleware, requireExecutive, catchAsync(vaultController.listPending));
router.patch(
  '/uploads/:id/review',
  authMiddleware,
  requireExecutive,
  catchAsync(vaultController.reviewUpload),
);
router.post('/uploads/:id/flag', authMiddleware, catchAsync(vaultController.flagUpload));
router.get('/flags', authMiddleware, requireExecutive, catchAsync(vaultController.listFlags));
router.patch(
  '/flags/:id/resolve',
  authMiddleware,
  requireExecutive,
  catchAsync(vaultController.resolveFlag),
);

export default router;

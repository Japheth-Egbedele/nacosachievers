import { Router } from 'express';
import { z } from 'zod';
import { catchAsync } from '../utils/catch-async.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { imageUpload } from '../middleware/upload.middleware.js';
import { uploadRateLimiter } from '../middleware/rate-limiter.js';
import {
  alumniQuerySchema,
  changePasswordSchema,
  updateMeSchema,
} from '../schemas/user.schema.js';
import * as usersController from '../controllers/users.controller.js';
import * as userYearbookController from '../controllers/user-yearbook.controller.js';

const patchYearbookSchema = z.object({
  edition_id: z.string().uuid().optional(),
  display_name: z.string().max(128).optional(),
  portrait_url: z.string().optional(),
  quote: z.string().max(500).optional(),
});

const router = Router();

router.get('/alumni', authMiddleware, validate(alumniQuerySchema, 'query'), catchAsync(usersController.listAlumni));
router.get('/leaderboard', authMiddleware, catchAsync(usersController.leaderboard));

router.get('/me', authMiddleware, catchAsync(usersController.getMe));
router.patch('/me', authMiddleware, validate(updateMeSchema), catchAsync(usersController.updateMe));
router.patch(
  '/me/password',
  authMiddleware,
  validate(changePasswordSchema),
  catchAsync(usersController.changePassword),
);

router.post(
  '/me/photo',
  authMiddleware,
  uploadRateLimiter,
  imageUpload.single('photo'),
  catchAsync(usersController.uploadPhoto),
);
router.delete('/me/photo', authMiddleware, catchAsync(usersController.deletePhoto));

router.get('/me/yearbook', authMiddleware, catchAsync(userYearbookController.getMyYearbook));
router.post(
  '/me/yearbook/portrait',
  authMiddleware,
  uploadRateLimiter,
  imageUpload.single('portrait'),
  catchAsync(userYearbookController.uploadPortrait),
);
router.patch(
  '/me/yearbook',
  authMiddleware,
  validate(patchYearbookSchema),
  catchAsync(userYearbookController.patchMyYearbook),
);

router.get('/:id/profile', catchAsync(usersController.getProfile));

export default router;

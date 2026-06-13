import { Router } from 'express';
import { z } from 'zod';
import { catchAsync } from '../utils/catch-async.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireActiveUser } from '../middleware/require-active-user.js';
import { requireMemberPortal } from '../middleware/require-member-portal.js';
import { imageUpload } from '../middleware/upload.middleware.js';
import { uploadRateLimiter } from '../middleware/rate-limiter.js';
import {
  alumniQuerySchema,
  changePasswordSchema,
  deleteMeSchema,
  updateMeSchema,
} from '../schemas/user.schema.js';
import { userLookupQuerySchema } from '../schemas/admin.schema.js';
import * as usersController from '../controllers/users.controller.js';
import * as userYearbookController from '../controllers/user-yearbook.controller.js';

const patchYearbookSchema = z.object({
  edition_id: z.string().uuid().optional(),
  display_name: z.string().max(128).optional(),
  portrait_url: z.string().optional(),
  quote: z.string().max(500).optional(),
});

const router = Router();

const memberGuard = [authMiddleware, catchAsync(requireActiveUser), requireMemberPortal];

router.get('/alumni', ...memberGuard, validate(alumniQuerySchema, 'query'), catchAsync(usersController.listAlumni));
router.get('/leaderboard', ...memberGuard, catchAsync(usersController.leaderboard));
router.get(
  '/lookup',
  authMiddleware,
  catchAsync(requireActiveUser),
  validate(userLookupQuerySchema, 'query'),
  catchAsync(usersController.lookupUsers),
);

router.get('/me', ...memberGuard, catchAsync(usersController.getMe));
router.patch('/me', ...memberGuard, validate(updateMeSchema), catchAsync(usersController.updateMe));
router.patch(
  '/me/password',
  ...memberGuard,
  validate(changePasswordSchema),
  catchAsync(usersController.changePassword),
);
router.delete(
  '/me',
  ...memberGuard,
  validate(deleteMeSchema),
  catchAsync(usersController.deleteMe),
);

router.post(
  '/me/photo',
  ...memberGuard,
  uploadRateLimiter,
  imageUpload.single('photo'),
  catchAsync(usersController.uploadPhoto),
);
router.delete('/me/photo', ...memberGuard, catchAsync(usersController.deletePhoto));

router.get('/me/yearbook', ...memberGuard, catchAsync(userYearbookController.getMyYearbook));
router.post(
  '/me/yearbook/portrait',
  ...memberGuard,
  uploadRateLimiter,
  imageUpload.single('portrait'),
  catchAsync(userYearbookController.uploadPortrait),
);
router.patch(
  '/me/yearbook',
  ...memberGuard,
  validate(patchYearbookSchema),
  catchAsync(userYearbookController.patchMyYearbook),
);

router.get('/:id/profile', catchAsync(usersController.getProfile));

export default router;

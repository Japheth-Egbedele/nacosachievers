import { Router } from 'express';
import { catchAsync } from '../utils/catch-async.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireExecutive } from '../middleware/role-guard.js';
import {
  adminCareersQuerySchema,
  verifyCareerSchema,
} from '../schemas/career.schema.js';
import * as adminCareersController from '../controllers/admin-careers.controller.js';

const router = Router();

router.use(authMiddleware, requireExecutive);

router.get(
  '/postings',
  validate(adminCareersQuerySchema, 'query'),
  catchAsync(adminCareersController.listPostings),
);
router.patch(
  '/postings/:id/verify',
  validate(verifyCareerSchema),
  catchAsync(adminCareersController.verifyPosting),
);

export default router;

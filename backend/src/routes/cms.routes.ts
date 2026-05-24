import { Router } from 'express';
import { catchAsync } from '../utils/catch-async.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireExecutive } from '../middleware/role-guard.js';
import { updateCmsSectionSchema } from '../schemas/cms.schema.js';
import * as cmsController from '../controllers/cms.controller.js';

const router = Router();

router.get('/:sectionKey', catchAsync(cmsController.getSection));
router.put(
  '/:sectionKey',
  authMiddleware,
  requireExecutive,
  validate(updateCmsSectionSchema),
  catchAsync(cmsController.updateSection),
);

export default router;

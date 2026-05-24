import { Router } from 'express';
import { catchAsync } from '../utils/catch-async.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { careerSubmitRateLimiter } from '../middleware/rate-limiter.js';
import {
  careerListQuerySchema,
  submitCareerSchema,
} from '../schemas/career.schema.js';
import * as careersController from '../controllers/careers.controller.js';

const router = Router();

router.get(
  '/postings',
  validate(careerListQuerySchema, 'query'),
  catchAsync(careersController.listPostings),
);
router.get('/postings/mine', authMiddleware, catchAsync(careersController.listMine));
router.post(
  '/postings',
  authMiddleware,
  careerSubmitRateLimiter,
  validate(submitCareerSchema),
  catchAsync(careersController.submitPosting),
);
router.get('/postings/:id', catchAsync(careersController.getPosting));

export default router;

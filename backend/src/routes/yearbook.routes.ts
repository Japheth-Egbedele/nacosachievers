import { Router } from 'express';
import { catchAsync } from '../utils/catch-async.js';
import { yearbookDownloadRateLimiter } from '../middleware/rate-limiter.js';
import * as yearbookController from '../controllers/yearbook.controller.js';

const router = Router();

router.get('/editions', catchAsync(yearbookController.listEditions));
router.get('/editions/:id', catchAsync(yearbookController.getEdition));
router.get(
  '/editions/:id/download',
  yearbookDownloadRateLimiter,
  catchAsync(yearbookController.downloadEdition),
);

export default router;

import { Router } from 'express';
import { catchAsync } from '../utils/catch-async.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { pinBulkRateLimiter } from '../middleware/rate-limiter.js';
import { requirePinIssuer } from '../middleware/require-pin-issuer.js';
import { generatePinBulkSchema } from '../schemas/auth.schema.js';
import * as adminPinsController from '../controllers/admin-pins.controller.js';

const router = Router();

router.use(authMiddleware, requirePinIssuer);

router.post('/generate', catchAsync(adminPinsController.generatePin));
router.post(
  '/generate-bulk',
  pinBulkRateLimiter,
  validate(generatePinBulkSchema),
  catchAsync(adminPinsController.generatePinBulk),
);

router.post('/invalidate/:id', catchAsync(adminPinsController.invalidatePin));

export default router;

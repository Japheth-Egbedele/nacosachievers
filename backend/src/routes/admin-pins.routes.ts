import { Router } from 'express';
import { catchAsync } from '../utils/catch-async.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireActiveUser } from '../middleware/require-active-user.js';
import { pinBulkRateLimiter } from '../middleware/rate-limiter.js';
import { requirePinIssuer } from '../middleware/require-pin-issuer.js';
import { generatePinBulkSchema, generatePinBulkStaffSchema } from '../schemas/auth.schema.js';
import * as adminPinsController from '../controllers/admin-pins.controller.js';

const router = Router();

router.use(authMiddleware, catchAsync(requireActiveUser), catchAsync(requirePinIssuer));

router.get('/', catchAsync(adminPinsController.listPins));
router.get('/config', catchAsync(adminPinsController.getPinConfig));
router.post('/generate', catchAsync(adminPinsController.generatePin));
router.post(
  '/generate-bulk',
  pinBulkRateLimiter,
  validate(generatePinBulkSchema),
  catchAsync(adminPinsController.generatePinBulk),
);
router.post(
  '/generate-bulk-staff',
  pinBulkRateLimiter,
  validate(generatePinBulkStaffSchema),
  catchAsync(adminPinsController.generatePinBulkStaff),
);

router.post('/invalidate/:id', catchAsync(adminPinsController.invalidatePin));

export default router;

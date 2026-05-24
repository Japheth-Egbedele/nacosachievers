import { Router } from 'express';
import { catchAsync } from '../utils/catch-async.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireSuperAdmin } from '../middleware/role-guard.js';
import { generatePinSchema } from '../schemas/auth.schema.js';
import * as adminPinsController from '../controllers/admin-pins.controller.js';

const router = Router();

router.use(authMiddleware, requireSuperAdmin);

router.post(
  '/generate',
  validate(generatePinSchema),
  catchAsync(adminPinsController.generatePin),
);

router.post('/invalidate/:id', catchAsync(adminPinsController.invalidatePin));

export default router;

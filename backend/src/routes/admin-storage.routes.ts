import { Router } from 'express';
import { catchAsync } from '../utils/catch-async.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireActiveUser } from '../middleware/require-active-user.js';
import { requireSuperAdmin } from '../middleware/role-guard.js';
import * as adminStorageController from '../controllers/admin-storage.controller.js';

const router = Router();

router.use(authMiddleware, catchAsync(requireActiveUser), requireSuperAdmin);

router.get('/usage', catchAsync(adminStorageController.getStorageUsage));

export default router;

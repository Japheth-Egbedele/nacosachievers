import { Router } from 'express';
import { catchAsync } from '../utils/catch-async.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireExecutive } from '../middleware/role-guard.js';
import * as vaultController from '../controllers/vault.controller.js';

const router = Router();
router.use(authMiddleware, requireExecutive);

router.post('/courses/:id/assignments', catchAsync(vaultController.createAssignment));
router.patch('/assignments/:id', catchAsync(vaultController.updateAssignment));
router.delete('/assignments/:id', catchAsync(vaultController.deleteAssignment));

export default router;

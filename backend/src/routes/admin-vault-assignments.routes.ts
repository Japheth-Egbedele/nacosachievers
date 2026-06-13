import { Router } from 'express';
import { catchAsync } from '../utils/catch-async.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireActiveUser } from '../middleware/require-active-user.js';
import { requireAdminScope } from '../middleware/require-admin-scope.js';
import { requireExecutive } from '../middleware/role-guard.js';
import * as vaultController from '../controllers/vault.controller.js';

const router = Router();
router.use(
  authMiddleware,
  catchAsync(requireActiveUser),
  requireExecutive,
  requireAdminScope('vault'),
);

router.post('/courses/:id/assignments', catchAsync(vaultController.createAssignment));
router.patch('/assignments/:id', catchAsync(vaultController.updateAssignment));
router.delete('/assignments/:id', catchAsync(vaultController.deleteAssignment));

export default router;

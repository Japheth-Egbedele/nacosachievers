import { Router } from 'express';
import { catchAsync } from '../utils/catch-async.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireExecutive } from '../middleware/role-guard.js';
import * as vaultController from '../controllers/vault.controller.js';

const router = Router();
router.use(authMiddleware, requireExecutive);

router.get('/', catchAsync(vaultController.listLecturers));
router.post('/', catchAsync(vaultController.createLecturer));
router.patch('/:id', catchAsync(vaultController.updateLecturer));
router.delete('/:id', catchAsync(vaultController.deleteLecturer));

export default router;

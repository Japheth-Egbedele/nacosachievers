import { Router } from 'express';
import { catchAsync } from '../utils/catch-async.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireActiveUser } from '../middleware/require-active-user.js';
import { requireMemberPortal } from '../middleware/require-member-portal.js';
import { blogQuerySchema } from '../schemas/cms.schema.js';
import * as notificationsController from '../controllers/notifications.controller.js';

const router = Router();

router.use(authMiddleware, catchAsync(requireActiveUser), requireMemberPortal);

router.get('/', validate(blogQuerySchema, 'query'), catchAsync(notificationsController.list));
router.patch('/read-all', catchAsync(notificationsController.markAllRead));
router.patch('/:id/read', catchAsync(notificationsController.markRead));

export default router;

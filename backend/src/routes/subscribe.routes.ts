import { Router } from 'express';
import { catchAsync } from '../utils/catch-async.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireActiveUser } from '../middleware/require-active-user.js';
import { requireAdminScope } from '../middleware/require-admin-scope.js';
import { requireExecutive } from '../middleware/role-guard.js';
import { subscribeSchema } from '../schemas/cms.schema.js';
import * as contactController from '../controllers/contact.controller.js';

const router = Router();

router.post('/', validate(subscribeSchema), catchAsync(contactController.subscribe));

export default router;

export const adminSubscribeRoutes = Router();
adminSubscribeRoutes.use(
  authMiddleware,
  catchAsync(requireActiveUser),
  requireExecutive,
  requireAdminScope('cms'),
);
adminSubscribeRoutes.get('/export', catchAsync(contactController.exportSubscribers));

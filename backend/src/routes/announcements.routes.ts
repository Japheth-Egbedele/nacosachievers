import { Router } from 'express';
import { catchAsync } from '../utils/catch-async.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireExecutive } from '../middleware/role-guard.js';
import {
  createAnnouncementSchema,
  updateAnnouncementSchema,
} from '../schemas/cms.schema.js';
import * as announcementsController from '../controllers/announcements.controller.js';

const publicRouter = Router();
publicRouter.get('/', catchAsync(announcementsController.listPublic));

const memberRouter = Router();
memberRouter.get('/members', authMiddleware, catchAsync(announcementsController.listMembers));

const adminRouter = Router();
adminRouter.use(authMiddleware, requireExecutive);
adminRouter.get('/', catchAsync(announcementsController.listAdmin));
adminRouter.post(
  '/',
  validate(createAnnouncementSchema),
  catchAsync(announcementsController.create),
);
adminRouter.patch(
  '/:id',
  validate(updateAnnouncementSchema),
  catchAsync(announcementsController.update),
);
adminRouter.delete('/:id', catchAsync(announcementsController.remove));

export {
  publicRouter as default,
  memberRouter as memberAnnouncementsRoutes,
  adminRouter as adminAnnouncementsRoutes,
};

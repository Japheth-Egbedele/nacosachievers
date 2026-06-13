import { Router } from 'express';
import { catchAsync } from '../utils/catch-async.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireActiveUser } from '../middleware/require-active-user.js';
import { requireAdminScope } from '../middleware/require-admin-scope.js';
import { requireExecutive } from '../middleware/role-guard.js';
import { imageUpload } from '../middleware/upload.middleware.js';
import { createEventSchema, updateEventSchema } from '../schemas/events.schema.js';
import * as adminEventsController from '../controllers/admin-events.controller.js';

const router = Router();

router.use(
  authMiddleware,
  catchAsync(requireActiveUser),
  requireExecutive,
  requireAdminScope('events'),
);

router.post(
  '/',
  imageUpload.single('banner_image'),
  validate(createEventSchema),
  catchAsync(adminEventsController.createEvent),
);
router.patch(
  '/:id',
  imageUpload.single('banner_image'),
  validate(updateEventSchema),
  catchAsync(adminEventsController.updateEvent),
);
router.delete('/:id', catchAsync(adminEventsController.deleteEvent));

router.get('/:id/rsvps/export', catchAsync(adminEventsController.exportRsvps));
router.get('/:id/rsvps', catchAsync(adminEventsController.listRsvps));

export default router;

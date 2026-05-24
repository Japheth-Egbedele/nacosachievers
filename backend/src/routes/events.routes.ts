import { Router } from 'express';
import { catchAsync } from '../utils/catch-async.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { eventsQuerySchema } from '../schemas/events.schema.js';
import * as eventsController from '../controllers/events.controller.js';

const router = Router();

router.get('/', validate(eventsQuerySchema, 'query'), catchAsync(eventsController.listEvents));
router.get('/:id', catchAsync(eventsController.getEvent));

router.post('/:id/rsvp', authMiddleware, catchAsync(eventsController.rsvp));
router.delete('/:id/rsvp', authMiddleware, catchAsync(eventsController.cancelRsvp));

export default router;

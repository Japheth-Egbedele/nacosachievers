import { Router } from 'express';
import { catchAsync } from '../utils/catch-async.js';
import { validate } from '../middleware/validate.js';
import { contactSchema } from '../schemas/cms.schema.js';
import * as contactController from '../controllers/contact.controller.js';

const router = Router();

router.post('/', validate(contactSchema), catchAsync(contactController.submitContact));

export default router;

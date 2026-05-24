import { Router } from 'express';
import { z } from 'zod';
import { catchAsync } from '../utils/catch-async.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { blogQuerySchema } from '../schemas/cms.schema.js';
import * as messagesController from '../controllers/messages.controller.js';

const createConversationSchema = z.object({
  user_id: z.string().uuid(),
});

const sendMessageSchema = z.object({
  content: z.string().min(1).max(5000),
});

const router = Router();

router.use(authMiddleware);

router.get('/conversations', catchAsync(messagesController.listConversations));
router.post(
  '/conversations',
  validate(createConversationSchema),
  catchAsync(messagesController.createConversation),
);
router.get(
  '/conversations/:id',
  validate(blogQuerySchema, 'query'),
  catchAsync(messagesController.getConversation),
);
router.post(
  '/conversations/:id/send',
  validate(sendMessageSchema),
  catchAsync(messagesController.sendMessage),
);
router.delete('/:messageId', catchAsync(messagesController.deleteMessage));

export default router;

import { Router } from 'express';
import { catchAsync } from '../utils/catch-async.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireActiveUser } from '../middleware/require-active-user.js';
import { requireMemberPortal } from '../middleware/require-member-portal.js';
import { transferRateLimiter } from '../middleware/rate-limiter.js';
import {
  transferSchema,
  walletTransactionsQuerySchema,
} from '../schemas/wallet.schema.js';
import * as walletController from '../controllers/wallet.controller.js';

const router = Router();

router.use(authMiddleware, catchAsync(requireActiveUser), requireMemberPortal);

router.get('/balance', catchAsync(walletController.getBalance));
router.get(
  '/transactions',
  validate(walletTransactionsQuerySchema, 'query'),
  catchAsync(walletController.listTransactions),
);
router.post('/transfer', transferRateLimiter, validate(transferSchema), catchAsync(walletController.transfer));

export default router;

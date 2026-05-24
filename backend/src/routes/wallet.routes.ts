import { Router } from 'express';
import { catchAsync } from '../utils/catch-async.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import {
  transferSchema,
  walletTransactionsQuerySchema,
} from '../schemas/wallet.schema.js';
import * as walletController from '../controllers/wallet.controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/balance', catchAsync(walletController.getBalance));
router.get(
  '/transactions',
  validate(walletTransactionsQuerySchema, 'query'),
  catchAsync(walletController.listTransactions),
);
router.post('/transfer', validate(transferSchema), catchAsync(walletController.transfer));

export default router;

import { Router } from 'express';
import { catchAsync } from '../utils/catch-async.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireExecutive } from '../middleware/role-guard.js';
import {
  adminWalletTransactionsQuerySchema,
  bulkCreditSchema,
} from '../schemas/wallet.schema.js';
import * as adminWalletController from '../controllers/admin-wallet.controller.js';

const router = Router();

router.use(authMiddleware, requireExecutive);

router.get(
  '/transactions',
  validate(adminWalletTransactionsQuerySchema, 'query'),
  catchAsync(adminWalletController.listTransactions),
);
router.post('/credit', validate(bulkCreditSchema), catchAsync(adminWalletController.bulkCredit));

export default router;

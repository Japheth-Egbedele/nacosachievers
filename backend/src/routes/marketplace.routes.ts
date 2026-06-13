import { Router } from 'express';
import { catchAsync } from '../utils/catch-async.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireActiveUser } from '../middleware/require-active-user.js';
import { requireMemberPortal } from '../middleware/require-member-portal.js';
import {
  marketplaceItemsQuerySchema,
  ordersMineQuerySchema,
  redeemSchema,
} from '../schemas/marketplace.schema.js';
import * as marketplaceController from '../controllers/marketplace.controller.js';

const router = Router();

router.get(
  '/items',
  validate(marketplaceItemsQuerySchema, 'query'),
  catchAsync(marketplaceController.listItems),
);
router.get('/items/:id', catchAsync(marketplaceController.getItem));

router.use(authMiddleware, catchAsync(requireActiveUser), requireMemberPortal);

router.post('/redeem', validate(redeemSchema), catchAsync(marketplaceController.redeem));
router.get(
  '/orders/mine',
  validate(ordersMineQuerySchema, 'query'),
  catchAsync(marketplaceController.listMyOrders),
);

export default router;

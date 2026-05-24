import { Router } from 'express';
import { catchAsync } from '../utils/catch-async.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireExecutive } from '../middleware/role-guard.js';
import { imageUpload } from '../middleware/upload.middleware.js';
import {
  adminOrdersQuerySchema,
  createItemSchema,
  fulfillOrderSchema,
  updateItemSchema,
} from '../schemas/marketplace.schema.js';
import * as adminMarketplaceController from '../controllers/admin-marketplace.controller.js';

const router = Router();

router.use(authMiddleware, requireExecutive);

router.post(
  '/items',
  imageUpload.single('image'),
  validate(createItemSchema),
  catchAsync(adminMarketplaceController.createItem),
);
router.patch(
  '/items/:id',
  imageUpload.single('image'),
  validate(updateItemSchema),
  catchAsync(adminMarketplaceController.updateItem),
);
router.delete('/items/:id', catchAsync(adminMarketplaceController.deleteItem));

router.get(
  '/orders',
  validate(adminOrdersQuerySchema, 'query'),
  catchAsync(adminMarketplaceController.listOrders),
);
router.patch(
  '/orders/:id/fulfill',
  validate(fulfillOrderSchema),
  catchAsync(adminMarketplaceController.fulfillOrder),
);

export default router;

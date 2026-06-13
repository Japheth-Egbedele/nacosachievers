import { Router } from 'express';
import { catchAsync } from '../utils/catch-async.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireActiveUser } from '../middleware/require-active-user.js';
import { requireAdminScope } from '../middleware/require-admin-scope.js';
import { requireExecutive } from '../middleware/role-guard.js';
import { imageUpload } from '../middleware/upload.middleware.js';
import { blogQuerySchema, createNewsSchema, updateNewsSchema } from '../schemas/cms.schema.js';
import * as newsController from '../controllers/news.controller.js';

const publicRouter = Router();
publicRouter.get('/', validate(blogQuerySchema, 'query'), catchAsync(newsController.listNews));
publicRouter.get('/:id', catchAsync(newsController.getNews));

const adminRouter = Router();
adminRouter.use(
  authMiddleware,
  catchAsync(requireActiveUser),
  requireExecutive,
  requireAdminScope('cms'),
);
adminRouter.post(
  '/',
  imageUpload.single('image'),
  validate(createNewsSchema),
  catchAsync(newsController.createNews),
);
adminRouter.patch(
  '/:id',
  imageUpload.single('image'),
  validate(updateNewsSchema),
  catchAsync(newsController.updateNews),
);
adminRouter.delete('/:id', catchAsync(newsController.deleteNews));

export { publicRouter as default, adminRouter as adminNewsRoutes };

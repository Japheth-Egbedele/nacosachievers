import { Router } from 'express';
import { catchAsync } from '../utils/catch-async.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireActiveUser } from '../middleware/require-active-user.js';
import { requireAdminScope } from '../middleware/require-admin-scope.js';
import { requireExecutive } from '../middleware/role-guard.js';
import { imageUpload } from '../middleware/upload.middleware.js';
import {
  blogQuerySchema,
  createBlogSchema,
  updateBlogSchema,
} from '../schemas/cms.schema.js';
import * as blogController from '../controllers/blog.controller.js';

const publicRouter = Router();
publicRouter.get('/', validate(blogQuerySchema, 'query'), catchAsync(blogController.listPosts));
publicRouter.get('/:slug', catchAsync(blogController.getPost));

const adminRouter = Router();
adminRouter.use(
  authMiddleware,
  catchAsync(requireActiveUser),
  requireExecutive,
  requireAdminScope('cms'),
);
adminRouter.get('/', validate(blogQuerySchema, 'query'), catchAsync(blogController.listPostsAdmin));
adminRouter.post(
  '/',
  imageUpload.single('cover_image'),
  validate(createBlogSchema),
  catchAsync(blogController.createPost),
);
adminRouter.patch(
  '/:id',
  imageUpload.single('cover_image'),
  validate(updateBlogSchema),
  catchAsync(blogController.updatePost),
);
adminRouter.delete('/:id', catchAsync(blogController.deletePost));

export { publicRouter as default, adminRouter as adminBlogRoutes };

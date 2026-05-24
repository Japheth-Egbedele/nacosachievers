import { Router } from 'express';
import { catchAsync } from '../utils/catch-async.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireExecutive } from '../middleware/role-guard.js';
import { imageUpload } from '../middleware/upload.middleware.js';
import { createGallerySchema } from '../schemas/cms.schema.js';
import * as galleryController from '../controllers/gallery.controller.js';

const publicRouter = Router();
publicRouter.get('/', catchAsync(galleryController.listGallery));

const adminRouter = Router();
adminRouter.use(authMiddleware, requireExecutive);
adminRouter.post(
  '/',
  imageUpload.single('image'),
  validate(createGallerySchema),
  catchAsync(galleryController.uploadImage),
);
adminRouter.delete('/:id', catchAsync(galleryController.deleteImage));

export { publicRouter as default, adminRouter as adminGalleryRoutes };

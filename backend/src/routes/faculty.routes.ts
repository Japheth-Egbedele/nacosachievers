import { Router } from 'express';
import { catchAsync } from '../utils/catch-async.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireActiveUser } from '../middleware/require-active-user.js';
import { requireAdminScope } from '../middleware/require-admin-scope.js';
import { requireExecutive } from '../middleware/role-guard.js';
import { imageUpload } from '../middleware/upload.middleware.js';
import { createFacultySchema, updateFacultySchema } from '../schemas/cms.schema.js';
import * as facultyController from '../controllers/faculty.controller.js';

const publicRouter = Router();
publicRouter.get('/', catchAsync(facultyController.listFaculty));

const adminRouter = Router();
adminRouter.use(
  authMiddleware,
  catchAsync(requireActiveUser),
  requireExecutive,
  requireAdminScope('cms'),
);
adminRouter.get('/', catchAsync(facultyController.listFacultyAdmin));
adminRouter.post(
  '/',
  imageUpload.single('photo'),
  validate(createFacultySchema),
  catchAsync(facultyController.createFaculty),
);
adminRouter.patch(
  '/:id',
  imageUpload.single('photo'),
  validate(updateFacultySchema),
  catchAsync(facultyController.updateFaculty),
);
adminRouter.delete('/:id', catchAsync(facultyController.deleteFaculty));

export { publicRouter as default, adminRouter as adminFacultyRoutes };

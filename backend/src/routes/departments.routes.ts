import { Router } from 'express';
import { catchAsync } from '../utils/catch-async.js';
import * as departmentsController from '../controllers/departments.controller.js';

const router = Router();

router.get('/', catchAsync(departmentsController.listDepartments));

export default router;

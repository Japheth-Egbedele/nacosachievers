import type { Request, Response } from 'express';
import { sendSuccess } from '../utils/response.js';
import * as departmentService from '../services/department.service.js';

export async function listDepartments(_req: Request, res: Response): Promise<void> {
  const data = await departmentService.listDepartments();
  sendSuccess(res, data);
}

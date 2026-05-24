import type { Request, Response } from 'express';
import { HTTP_STATUS } from '../constants/http.js';
import { sendSuccess } from '../utils/response.js';
import * as cmsService from '../services/cms.service.js';

/**
 * GET /faculty
 */
export async function listFaculty(_req: Request, res: Response): Promise<void> {
  const data = await cmsService.listFaculty();
  sendSuccess(res, data);
}

/**
 * GET /admin/faculty
 */
export async function listFacultyAdmin(_req: Request, res: Response): Promise<void> {
  const data = await cmsService.listFacultyAdmin();
  sendSuccess(res, data);
}

/**
 * POST /admin/faculty
 */
export async function createFaculty(req: Request, res: Response): Promise<void> {
  const data = await cmsService.createFaculty(req.body, req.file);
  sendSuccess(res, data, HTTP_STATUS.CREATED);
}

/**
 * PATCH /admin/faculty/:id
 */
export async function updateFaculty(req: Request, res: Response): Promise<void> {
  const data = await cmsService.updateFaculty(req.params.id!, req.body, req.file);
  sendSuccess(res, data);
}

/**
 * DELETE /admin/faculty/:id
 */
export async function deleteFaculty(req: Request, res: Response): Promise<void> {
  await cmsService.deleteFaculty(req.params.id!);
  sendSuccess(res, null, HTTP_STATUS.OK, 'Faculty entry deleted');
}

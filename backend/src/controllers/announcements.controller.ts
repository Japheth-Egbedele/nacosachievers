import type { Request, Response } from 'express';
import { HTTP_STATUS } from '../constants/http.js';
import { sendSuccess } from '../utils/response.js';
import * as cmsService from '../services/cms.service.js';

/**
 * GET /announcements (public)
 */
export async function listPublic(_req: Request, res: Response): Promise<void> {
  const data = await cmsService.listAnnouncements('public');
  sendSuccess(res, data);
}

/**
 * GET /announcements/members (auth)
 */
export async function listMembers(_req: Request, res: Response): Promise<void> {
  const data = await cmsService.listAnnouncements('member');
  sendSuccess(res, data);
}

/**
 * GET /admin/announcements
 */
export async function listAdmin(_req: Request, res: Response): Promise<void> {
  const data = await cmsService.listAnnouncementsAdmin();
  sendSuccess(res, data);
}

/**
 * POST /admin/announcements
 */
export async function create(req: Request, res: Response): Promise<void> {
  const data = await cmsService.createAnnouncement(req.body, req.user!.id);
  sendSuccess(res, data, HTTP_STATUS.CREATED);
}

/**
 * PATCH /admin/announcements/:id
 */
export async function update(req: Request, res: Response): Promise<void> {
  const data = await cmsService.updateAnnouncement(req.params.id!, req.body);
  sendSuccess(res, data);
}

/**
 * DELETE /admin/announcements/:id
 */
export async function remove(req: Request, res: Response): Promise<void> {
  await cmsService.deleteAnnouncement(req.params.id!);
  sendSuccess(res, null, HTTP_STATUS.OK, 'Announcement deleted');
}

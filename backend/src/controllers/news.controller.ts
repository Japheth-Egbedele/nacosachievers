import type { Request, Response } from 'express';
import { HTTP_STATUS } from '../constants/http.js';
import { sendPaginated, sendSuccess } from '../utils/response.js';
import * as cmsService from '../services/cms.service.js';

/**
 * GET /news
 */
export async function listNews(req: Request, res: Response): Promise<void> {
  const { items, meta } = await cmsService.listNews(req.query);
  sendPaginated(res, items, meta);
}

/**
 * GET /news/:id
 */
export async function getNews(req: Request, res: Response): Promise<void> {
  const data = await cmsService.getNewsItem(req.params.id!);
  sendSuccess(res, data);
}

/**
 * POST /admin/news
 */
export async function createNews(req: Request, res: Response): Promise<void> {
  const body = req.body as { title: string; body: string };
  const data = await cmsService.createNewsItem(
    { title: body.title, body: body.body, createdBy: req.user!.id },
    req.file,
  );
  sendSuccess(res, data, HTTP_STATUS.CREATED);
}

/**
 * PATCH /admin/news/:id
 */
export async function updateNews(req: Request, res: Response): Promise<void> {
  const body = req.body as { title?: string; body?: string };
  const data = await cmsService.updateNewsItem(req.params.id!, body, req.file);
  sendSuccess(res, data);
}

/**
 * DELETE /admin/news/:id
 */
export async function deleteNews(req: Request, res: Response): Promise<void> {
  await cmsService.deleteNewsItem(req.params.id!);
  sendSuccess(res, null, HTTP_STATUS.OK, 'News item deleted');
}

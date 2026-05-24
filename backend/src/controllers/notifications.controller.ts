import type { Request, Response } from 'express';
import { sendPaginated, sendSuccess } from '../utils/response.js';
import * as notificationListService from '../services/notification-list.service.js';

/**
 * GET /notifications
 */
export async function list(req: Request, res: Response): Promise<void> {
  const { items, meta } = await notificationListService.listNotifications(
    req.user!.id,
    req.query,
  );
  sendPaginated(res, items, meta);
}

/**
 * PATCH /notifications/:id/read
 */
export async function markRead(req: Request, res: Response): Promise<void> {
  await notificationListService.markRead(req.user!.id, req.params.id!);
  sendSuccess(res, null);
}

/**
 * PATCH /notifications/read-all
 */
export async function markAllRead(req: Request, res: Response): Promise<void> {
  const result = await notificationListService.markAllRead(req.user!.id);
  sendSuccess(res, result);
}

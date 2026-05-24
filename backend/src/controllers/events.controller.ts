import type { Request, Response } from 'express';
import { HTTP_STATUS } from '../constants/http.js';
import { sendPaginated, sendSuccess } from '../utils/response.js';
import * as eventsService from '../services/events.service.js';

/**
 * GET /events
 */
export async function listEvents(req: Request, res: Response): Promise<void> {
  const { items, meta } = await eventsService.listEvents(req.query);
  sendPaginated(res, items, meta);
}

/**
 * GET /events/:id
 */
export async function getEvent(req: Request, res: Response): Promise<void> {
  const userId = req.user?.id;
  const data = await eventsService.getEvent(req.params.id!, userId);
  sendSuccess(res, data);
}

/**
 * POST /events/:id/rsvp
 */
export async function rsvp(req: Request, res: Response): Promise<void> {
  await eventsService.createRsvp(req.params.id!, req.user!.id);
  sendSuccess(res, null, HTTP_STATUS.CREATED, 'RSVP confirmed');
}

/**
 * DELETE /events/:id/rsvp
 */
export async function cancelRsvp(req: Request, res: Response): Promise<void> {
  await eventsService.cancelRsvp(req.params.id!, req.user!.id);
  sendSuccess(res, null, HTTP_STATUS.OK, 'RSVP cancelled');
}

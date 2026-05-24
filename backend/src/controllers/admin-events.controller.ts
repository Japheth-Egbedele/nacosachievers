import type { Request, Response } from 'express';
import { HTTP_STATUS } from '../constants/http.js';
import { sendSuccess } from '../utils/response.js';
import * as eventsService from '../services/events.service.js';

/**
 * POST /admin/events
 */
export async function createEvent(req: Request, res: Response): Promise<void> {
  const data = await eventsService.createEvent(req.body, req.user!.id, req.file);
  sendSuccess(res, data, HTTP_STATUS.CREATED);
}

/**
 * PATCH /admin/events/:id
 */
export async function updateEvent(req: Request, res: Response): Promise<void> {
  const data = await eventsService.updateEvent(req.params.id!, req.body, req.file);
  sendSuccess(res, data);
}

/**
 * DELETE /admin/events/:id
 */
export async function deleteEvent(req: Request, res: Response): Promise<void> {
  await eventsService.deleteEvent(req.params.id!);
  sendSuccess(res, null, HTTP_STATUS.OK, 'Event deleted');
}

/**
 * GET /admin/events/:id/rsvps
 */
export async function listRsvps(req: Request, res: Response): Promise<void> {
  const data = await eventsService.listEventRsvps(req.params.id!);
  sendSuccess(res, data);
}

/**
 * GET /admin/events/:id/rsvps/export
 */
export async function exportRsvps(req: Request, res: Response): Promise<void> {
  const csv = await eventsService.exportEventRsvpsCsv(req.params.id!);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="event-${req.params.id}-rsvps.csv"`);
  res.status(HTTP_STATUS.OK).send(csv);
}

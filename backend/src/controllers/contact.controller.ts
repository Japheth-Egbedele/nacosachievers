import type { Request, Response } from 'express';
import { HTTP_STATUS } from '../constants/http.js';
import { sendSuccess } from '../utils/response.js';
import * as cmsService from '../services/cms.service.js';

/**
 * POST /contact
 */
export async function submitContact(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    name: string;
    email: string;
    subject: string;
    message: string;
  };
  await cmsService.sendContactMessage(body);
  sendSuccess(res, null, HTTP_STATUS.OK, 'Message sent');
}

/**
 * POST /subscribe
 */
export async function subscribe(req: Request, res: Response): Promise<void> {
  const { email } = req.body as { email: string };
  await cmsService.subscribe(email);
  sendSuccess(res, null, HTTP_STATUS.OK, 'Subscribed successfully');
}

/**
 * GET /admin/subscribers/export
 */
export async function exportSubscribers(_req: Request, res: Response): Promise<void> {
  const csv = await cmsService.exportSubscribersCsv();
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="subscribers.csv"');
  res.status(HTTP_STATUS.OK).send(csv);
}

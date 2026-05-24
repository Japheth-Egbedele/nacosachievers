import type { Request, Response } from 'express';
import { sendPaginated, sendSuccess } from '../utils/response.js';
import * as careerService from '../services/career.service.js';

export async function listPostings(req: Request, res: Response): Promise<void> {
  const { items, meta } = await careerService.listAdminPostings(req.query);
  sendPaginated(res, items, meta);
}

export async function verifyPosting(req: Request, res: Response): Promise<void> {
  const body = req.body as { status: 'verified' | 'rejected'; reason?: string };
  const data = await careerService.verifyPosting(req.params.id!, req.user!.id, body);
  sendSuccess(res, data);
}

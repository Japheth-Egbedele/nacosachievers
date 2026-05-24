import type { Request, Response } from 'express';
import { HTTP_STATUS } from '../constants/http.js';
import { sendPaginated, sendSuccess } from '../utils/response.js';
import * as careerService from '../services/career.service.js';

export async function listPostings(req: Request, res: Response): Promise<void> {
  const { items, meta } = await careerService.listPublicPostings(req.query);
  sendPaginated(res, items, meta);
}

export async function getPosting(req: Request, res: Response): Promise<void> {
  const data = await careerService.getPublicPosting(req.params.id!);
  sendSuccess(res, data);
}

export async function submitPosting(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    title: string;
    organization: string;
    description: string;
    application_url: string;
    location?: string;
    work_mode: 'onsite' | 'remote' | 'hybrid';
    expires_at?: string;
  };
  const data = await careerService.submitPosting(req.user!.id, body);
  sendSuccess(res, data, HTTP_STATUS.CREATED);
}

export async function listMine(req: Request, res: Response): Promise<void> {
  const { items, meta } = await careerService.listMyPostings(req.user!.id, req.query);
  sendPaginated(res, items, meta);
}

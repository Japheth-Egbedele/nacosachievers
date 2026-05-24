import type { Request, Response } from 'express';
import { HTTP_STATUS } from '../constants/http.js';
import { sendSuccess } from '../utils/response.js';
import { ValidationError } from '../utils/errors.js';
import * as yearbookService from '../services/yearbook.service.js';

export async function uploadPortrait(req: Request, res: Response): Promise<void> {
  const file = req.file;
  if (!file) throw new ValidationError('Portrait file is required');
  const data = await yearbookService.uploadPortrait(
    req.user!.id,
    file.buffer,
    file.mimetype,
    file.originalname,
  );
  sendSuccess(res, data, HTTP_STATUS.CREATED);
}

export async function patchMyYearbook(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    edition_id?: string;
    display_name?: string;
    portrait_url?: string;
    quote?: string;
  };
  const data = await yearbookService.memberPatchYearbook(req.user!.id, body);
  sendSuccess(res, data);
}

export async function getMyYearbook(req: Request, res: Response): Promise<void> {
  const editionId = req.query.edition_id as string | undefined;
  const data = await yearbookService.getMemberYearbookSlot(req.user!.id, editionId);
  sendSuccess(res, data);
}

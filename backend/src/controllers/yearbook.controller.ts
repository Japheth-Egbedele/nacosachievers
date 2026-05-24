import type { Request, Response } from 'express';
import { HTTP_STATUS } from '../constants/http.js';
import { sendSuccess } from '../utils/response.js';
import * as yearbookService from '../services/yearbook.service.js';

export async function listEditions(_req: Request, res: Response): Promise<void> {
  const data = await yearbookService.listPublicEditions();
  sendSuccess(res, data);
}

export async function getEdition(req: Request, res: Response): Promise<void> {
  const data = await yearbookService.getPublicEdition(req.params.id!);
  sendSuccess(res, data);
}

export async function downloadEdition(req: Request, res: Response): Promise<void> {
  const result = await yearbookService.getEditionDownload(req.params.id!);
  if (result.status === 'building') {
    res.status(HTTP_STATUS.ACCEPTED).json({
      success: true,
      data: { pdf_build_status: result.pdf_build_status },
      message: 'PDF is being generated',
    });
    return;
  }
  sendSuccess(res, { url: result.url, pdf_build_status: result.pdf_build_status });
}

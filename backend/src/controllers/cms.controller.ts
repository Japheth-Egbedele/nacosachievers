import type { Request, Response } from 'express';
import { sendSuccess } from '../utils/response.js';
import * as cmsService from '../services/cms.service.js';

/**
 * GET /cms/:sectionKey
 */
export async function getSection(req: Request, res: Response): Promise<void> {
  const data = await cmsService.getCmsSection(req.params.sectionKey!);
  sendSuccess(res, data);
}

/**
 * PUT /cms/:sectionKey
 */
export async function updateSection(req: Request, res: Response): Promise<void> {
  const { content } = req.body as { content: Record<string, unknown> };
  const data = await cmsService.updateCmsSection(
    req.params.sectionKey!,
    content,
    req.user!.id,
  );
  sendSuccess(res, data);
}

import type { Request, Response } from 'express';
import { HTTP_STATUS } from '../constants/http.js';
import { ValidationError } from '../utils/errors.js';
import { sendSuccess } from '../utils/response.js';
import * as cmsService from '../services/cms.service.js';

/**
 * GET /gallery
 */
export async function listGallery(_req: Request, res: Response): Promise<void> {
  const data = await cmsService.listGallery();
  sendSuccess(res, data);
}

/**
 * POST /admin/gallery
 */
export async function uploadImage(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    throw new ValidationError('Image required');
  }
  const body = req.body as {
    title?: string;
    event_id?: string | null;
    tags?: string[];
  };
  const data = await cmsService.createGalleryItem(
    {
      title: body.title,
      event_id: body.event_id,
      tags: body.tags,
      uploadedBy: req.user!.id,
    },
    req.file,
  );
  sendSuccess(res, data, HTTP_STATUS.CREATED);
}

/**
 * DELETE /admin/gallery/:id
 */
export async function deleteImage(req: Request, res: Response): Promise<void> {
  await cmsService.deleteGalleryItem(req.params.id!);
  sendSuccess(res, null, HTTP_STATUS.OK, 'Image deleted');
}

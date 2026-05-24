import type { Request, Response } from 'express';
import { HTTP_STATUS } from '../constants/http.js';
import { sendSuccess } from '../utils/response.js';
import * as yearbookService from '../services/yearbook.service.js';

export async function listEditions(_req: Request, res: Response): Promise<void> {
  const data = await yearbookService.listAdminEditions();
  sendSuccess(res, data);
}

export async function createEdition(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    title: string;
    session_id?: string;
    submissions_open?: boolean;
    cohort_alumni_unlocked_at?: string;
  };
  const data = await yearbookService.createEdition(body, req.user!.id);
  sendSuccess(res, data, HTTP_STATUS.CREATED);
}

export async function updateEdition(req: Request, res: Response): Promise<void> {
  const body = req.body as Record<string, unknown>;
  const data = await yearbookService.updateEdition(req.params.id!, {
    title: body.title as string | undefined,
    session_id: body.session_id as string | null | undefined,
    submissions_open: body.submissions_open as boolean | undefined,
    cohort_alumni_unlocked_at: body.cohort_alumni_unlocked_at as string | null | undefined,
    status: body.status as 'draft' | 'published' | 'archived' | undefined,
  });
  sendSuccess(res, data);
}

export async function listSlots(req: Request, res: Response): Promise<void> {
  const data = await yearbookService.listEditionSlots(req.params.id!);
  sendSuccess(res, data);
}

export async function patchSlot(req: Request, res: Response): Promise<void> {
  const body = req.body as Record<string, unknown>;
  const data = await yearbookService.adminPatchSlot(
    req.params.id!,
    req.params.userId!,
    {
      display_name: body.display_name as string | undefined,
      portrait_url: body.portrait_url as string | null | undefined,
      quote: body.quote as string | null | undefined,
      include_in_yearbook: body.include_in_yearbook as boolean | undefined,
      sort_key: body.sort_key as number | undefined,
      admin_notes: body.admin_notes as string | null | undefined,
    },
    req.user!.id,
  );
  sendSuccess(res, data);
}

export async function rebuildPdf(req: Request, res: Response): Promise<void> {
  await yearbookService.rebuildPdf(req.params.id!);
  sendSuccess(res, { queued: true }, HTTP_STATUS.ACCEPTED, 'PDF rebuild queued');
}

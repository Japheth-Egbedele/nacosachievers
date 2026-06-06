import type { Request, Response } from 'express';
import { HTTP_STATUS } from '../constants/http.js';
import { ForbiddenError } from '../utils/errors.js';
import { sendPaginated, sendSuccess } from '../utils/response.js';
import * as adminService from '../services/admin.service.js';
import * as auditService from '../services/audit.service.js';

export async function listMembers(req: Request, res: Response): Promise<void> {
  const { items, meta } = await adminService.listMembers(req.query);
  sendPaginated(res, items, meta);
}

export async function getMember(req: Request, res: Response): Promise<void> {
  const data = await adminService.getMemberDetail(req.params.id!);
  sendSuccess(res, data);
}

export async function patchMember(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    role?: string;
    is_active?: boolean;
    academic_status?: string;
    can_issue_pins?: boolean;
  };

  if (body.can_issue_pins !== undefined && req.user!.role !== 'super_admin') {
    throw new ForbiddenError('Only super admins can grant PIN issuer access');
  }

  const data = await adminService.patchMember(req.params.id!, {
    role: body.role as Parameters<typeof adminService.patchMember>[1]['role'],
    is_active: body.is_active,
    academic_status: body.academic_status as Parameters<
      typeof adminService.patchMember
    >[1]['academic_status'],
    can_issue_pins: body.can_issue_pins,
  });
  sendSuccess(res, data);
}

export async function getAnalytics(_req: Request, res: Response): Promise<void> {
  const data = await adminService.getAnalytics();
  sendSuccess(res, data);
}

export async function assignExecutive(req: Request, res: Response): Promise<void> {
  const body = req.body as { user_id: string; session_id?: string; role_title: string };
  const data = await adminService.assignExecutive({
    userId: body.user_id,
    sessionId: body.session_id,
    roleTitle: body.role_title,
    assignedBy: req.user!.id,
  });
  sendSuccess(res, data, HTTP_STATUS.CREATED);
}

export async function revokeExecutive(req: Request, res: Response): Promise<void> {
  await adminService.revokeExecutive(req.params.assignmentId!);
  sendSuccess(res, null, HTTP_STATUS.OK, 'Executive assignment revoked');
}

export async function listExecutives(_req: Request, res: Response): Promise<void> {
  const data = await adminService.listExecutives();
  sendSuccess(res, data);
}

export async function listAuditLogs(req: Request, res: Response): Promise<void> {
  const page = req.query.page ? Number(req.query.page) : 1;
  const limit = req.query.limit ? Number(req.query.limit) : 30;
  const action = req.query.action as string | undefined;
  const data = await auditService.listAuditLogs({ page, limit, action });
  sendPaginated(res, data.items, data.meta);
}

export async function getSettings(_req: Request, res: Response): Promise<void> {
  const data = await adminService.getSettings();
  sendSuccess(res, data);
}

export async function patchSettings(req: Request, res: Response): Promise<void> {
  const data = await adminService.updateSettings(
    req.body as Record<string, unknown>,
    req.user!.id,
  );
  sendSuccess(res, data);
}

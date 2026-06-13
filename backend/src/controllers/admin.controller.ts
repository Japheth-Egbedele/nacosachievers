import type { Request, Response } from 'express';
import { HTTP_STATUS } from '../constants/http.js';
import { ForbiddenError } from '../utils/errors.js';
import { sendPaginated, sendSuccess } from '../utils/response.js';
import * as adminService from '../services/admin.service.js';
import * as auditService from '../services/audit.service.js';
import * as sessionPromotionService from '../services/session-promotion.service.js';
import { officeDisplayTitle } from '../constants/executive-offices.js';
import type { AdminScope } from '../constants/admin-scopes.js';
import type { UserRole } from '../constants/enums.js';

export async function listMembers(req: Request, res: Response): Promise<void> {
  const { items, meta } = await adminService.listMembers(req.query);
  sendPaginated(res, items, meta);
}

export async function getMemberStats(req: Request, res: Response): Promise<void> {
  const query = req.query as { scope?: string };
  const data = await adminService.getMemberStats(query.scope);
  sendSuccess(res, data);
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
    level?: string;
    year_of_admission?: number;
    expected_graduation_year?: number;
    actual_graduation_year?: number;
    admin_scopes?: AdminScope[];
  };

  if (body.can_issue_pins !== undefined && req.user!.role !== 'super_admin') {
    throw new ForbiddenError('Only super admins can grant PIN issuer access');
  }

  const restrictedAcademicFields =
    body.year_of_admission !== undefined ||
    body.expected_graduation_year !== undefined ||
    body.actual_graduation_year !== undefined;
  if (restrictedAcademicFields && req.user!.role !== 'super_admin') {
    throw new ForbiddenError('Only super admins can edit admission and graduation years');
  }
  if (body.admin_scopes !== undefined && req.user!.role !== 'super_admin') {
    throw new ForbiddenError('Only super admins can edit admin scopes');
  }

  const data = await adminService.patchMember(req.params.id!, req.user!.role as UserRole, {
    role: body.role as UserRole | undefined,
    is_active: body.is_active,
    academic_status: body.academic_status as Parameters<
      typeof adminService.patchMember
    >[2]['academic_status'],
    can_issue_pins: body.can_issue_pins,
    level: body.level as Parameters<typeof adminService.patchMember>[2]['level'],
    year_of_admission: body.year_of_admission,
    expected_graduation_year: body.expected_graduation_year,
    actual_graduation_year: body.actual_graduation_year,
    admin_scopes: body.admin_scopes,
  });
  sendSuccess(res, data);
}

export async function syncExecutiveScopes(_req: Request, res: Response): Promise<void> {
  const data = await adminService.syncExecutiveScopes();
  sendSuccess(res, data, HTTP_STATUS.OK, `Synced scopes for ${data.updated} executive(s)`);
}

export async function getAnalytics(_req: Request, res: Response): Promise<void> {
  const data = await adminService.getAnalytics();
  sendSuccess(res, data);
}

export async function assignExecutive(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    user_id: string;
    session_id?: string;
    role_title?: string;
    office_key?: string;
  };
  const data = await adminService.assignExecutive({
    userId: body.user_id,
    sessionId: body.session_id,
    roleTitle: body.role_title ?? body.office_key ?? 'Executive',
    officeKey: body.office_key,
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
  const enriched = data.map((row) => {
    const r = row as {
      role_title: string;
      office_key?: string | null;
      [key: string]: unknown;
    };
    return {
      ...r,
      display_title: officeDisplayTitle(r.office_key, r.role_title),
    };
  });
  sendSuccess(res, enriched);
}

export async function previewSessionPromotion(_req: Request, res: Response): Promise<void> {
  const data = await sessionPromotionService.previewSessionPromotion();
  sendSuccess(res, data);
}

export async function applySessionPromotion(_req: Request, res: Response): Promise<void> {
  const data = await sessionPromotionService.applySessionPromotion();
  sendSuccess(res, data);
}

export async function previewGraduateCohort(_req: Request, res: Response): Promise<void> {
  const data = await sessionPromotionService.previewGraduateCohort();
  sendSuccess(res, data);
}

export async function applyGraduateCohort(_req: Request, res: Response): Promise<void> {
  const data = await sessionPromotionService.applyGraduateCohort();
  sendSuccess(res, data);
}

export async function lookupUsers(req: Request, res: Response): Promise<void> {
  const search = String(req.query.search ?? '');
  const limit = req.query.limit ? Number(req.query.limit) : 20;
  const data = await sessionPromotionService.lookupUsers(search, limit);
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

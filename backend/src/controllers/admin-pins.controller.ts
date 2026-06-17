import type { Request, Response } from 'express';
import { HTTP_STATUS } from '../constants/http.js';
import { ValidationError } from '../utils/errors.js';
import { sendSuccess } from '../utils/response.js';
import * as auditService from '../services/audit.service.js';
import * as pinService from '../services/pin.service.js';
import * as settingsService from '../services/settings.service.js';
import {
  generatePinBulkSchema,
  generatePinBulkStaffSchema,
  generatePinStaffSchema,
  generatePinStudentSchema,
} from '../schemas/auth.schema.js';

/**
 * POST /admin/pins/generate
 */
export async function generatePin(req: Request, res: Response): Promise<void> {
  const isSuperAdmin = req.user!.role === 'super_admin';
  const body = req.body as Record<string, unknown>;

  if (body.staff_email) {
    if (!isSuperAdmin) {
      throw new ValidationError('Only super admins can issue staff PINs');
    }
    const parsed = generatePinStaffSchema.parse(body);
    const result = await pinService.createPin({
      staffEmail: parsed.staff_email,
      createdBy: req.user!.id,
      departmentId: parsed.department_id,
      levelOfEntry: 'staff',
      admissionType: parsed.admission_type,
      allowStaff: true,
    });
    await auditService.logAudit({
      actorId: req.user!.id,
      action: 'pin_generated',
      entityType: 'onboarding_pin',
      entityId: result.id,
      metadata: { staff_email: parsed.staff_email, kind: 'staff' },
      ipAddress: req.ip,
    });
    sendSuccess(
      res,
      {
        id: result.id,
        pin: result.pin,
        staff_email: parsed.staff_email,
        matric_number: result.matric_number,
      },
      HTTP_STATUS.CREATED,
      'Staff PIN generated. Share securely.',
    );
    return;
  }

  const parsed = generatePinStudentSchema.parse(body);
  const result = await pinService.createPin({
    matricNumber: parsed.matric_number,
    createdBy: req.user!.id,
    departmentId: parsed.department_id,
    levelOfEntry: parsed.level_of_entry,
    admissionType: parsed.admission_type,
    yearOfAdmission: parsed.year_of_admission,
    allowStaff: false,
  });

  await auditService.logAudit({
    actorId: req.user!.id,
    action: 'pin_generated',
    entityType: 'onboarding_pin',
    entityId: result.id,
    metadata: {
      matric_number: parsed.matric_number,
      level_of_entry: parsed.level_of_entry ?? null,
      kind: 'student',
    },
    ipAddress: req.ip,
  });

  sendSuccess(
    res,
    { id: result.id, pin: result.pin, matric_number: parsed.matric_number },
    HTTP_STATUS.CREATED,
    'PIN generated. Share securely with the member.',
  );
}

/**
 * POST /admin/pins/generate-bulk — up to 10 student PINs; all-or-nothing on failure.
 */
export async function generatePinBulk(req: Request, res: Response): Promise<void> {
  const parsed = generatePinBulkSchema.parse(req.body);
  const createdIds: string[] = [];
  const items: Array<{
    id: string;
    pin: string;
    matric_number: string;
    level_of_entry: string;
    year_of_admission?: number;
  }> = [];

  try {
    for (const row of parsed.pins) {
      const result = await pinService.createPin({
        matricNumber: row.matric_number,
        createdBy: req.user!.id,
        departmentId: row.department_id,
        levelOfEntry: row.level_of_entry,
        admissionType: row.admission_type,
        yearOfAdmission: row.year_of_admission,
        allowStaff: false,
      });
      createdIds.push(result.id);
      items.push({
        id: result.id,
        pin: result.pin,
        matric_number: result.matric_number,
        level_of_entry: row.level_of_entry,
        ...(row.year_of_admission !== undefined
          ? { year_of_admission: row.year_of_admission }
          : {}),
      });
    }
  } catch (err) {
    await pinService.expirePinIds(createdIds);
    throw err;
  }

  await auditService.logAudit({
    actorId: req.user!.id,
    action: 'pin_generated_bulk',
    entityType: 'onboarding_pin',
    metadata: {
      count: items.length,
      matric_numbers: items.map((i) => i.matric_number),
      kind: 'student',
    },
    ipAddress: req.ip,
  });

  sendSuccess(
    res,
    { items },
    HTTP_STATUS.CREATED,
    `${items.length} PIN(s) generated. Share securely.`,
  );
}

/**
 * POST /admin/pins/generate-bulk-staff — up to 10 staff PINs; super admin only; all-or-nothing.
 */
export async function generatePinBulkStaff(req: Request, res: Response): Promise<void> {
  if (req.user!.role !== 'super_admin') {
    throw new ValidationError('Only super admins can issue staff PINs');
  }

  const parsed = generatePinBulkStaffSchema.parse(req.body);
  const createdIds: string[] = [];
  const items: Array<{
    id: string;
    pin: string;
    staff_email: string;
    matric_number: string;
  }> = [];

  try {
    for (const row of parsed.pins) {
      const result = await pinService.createPin({
        staffEmail: row.staff_email,
        createdBy: req.user!.id,
        departmentId: row.department_id,
        levelOfEntry: 'staff',
        admissionType: row.admission_type,
        allowStaff: true,
      });
      createdIds.push(result.id);
      items.push({
        id: result.id,
        pin: result.pin,
        staff_email: row.staff_email.trim().toLowerCase(),
        matric_number: result.matric_number,
      });
    }
  } catch (err) {
    await pinService.expirePinIds(createdIds);
    throw err;
  }

  await auditService.logAudit({
    actorId: req.user!.id,
    action: 'pin_generated_bulk',
    entityType: 'onboarding_pin',
    metadata: {
      count: items.length,
      staff_emails: items.map((i) => i.staff_email),
      kind: 'staff',
    },
    ipAddress: req.ip,
  });

  sendSuccess(
    res,
    { items },
    HTTP_STATUS.CREATED,
    `${items.length} staff PIN(s) generated. Share securely.`,
  );
}

/**
 * GET /admin/pins/:id/reveal — recover an active unused PIN (audited).
 */
export async function revealPin(req: Request, res: Response): Promise<void> {
  const isSuperAdmin = req.user!.role === 'super_admin';
  const data = await pinService.revealPinForActor(req.params.id!, req.user!.id, isSuperAdmin);

  await auditService.logAudit({
    actorId: req.user!.id,
    action: 'pin_revealed',
    entityType: 'onboarding_pin',
    entityId: data.id,
    metadata: {
      matric_number: data.matric_number,
      staff_email: data.staff_email,
    },
    ipAddress: req.ip,
  });

  sendSuccess(res, data, HTTP_STATUS.OK, 'PIN revealed. Share securely.');
}

/**
 * GET /admin/pins — recent PINs for the issuer.
 */
export async function listPins(req: Request, res: Response): Promise<void> {
  const isSuperAdmin = req.user!.role === 'super_admin';
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  const data = await pinService.listPinsForActor(req.user!.id, isSuperAdmin, limit);
  sendSuccess(res, { pins: data });
}

/**
 * GET /admin/pins/config — PIN issuance settings for issuers.
 */
export async function getPinConfig(_req: Request, res: Response): Promise<void> {
  const pin_expiry_hours = await settingsService.getPinExpiryHours();
  const recovery = pinService.getPinRecoveryStatus();
  sendSuccess(res, {
    pin_expiry_hours,
    pin_expiry_days: Math.round(pin_expiry_hours / 24),
    pin_recovery_enabled: recovery.enabled,
  });
}

/**
 * POST /admin/pins/invalidate/:id
 */
export async function invalidatePin(req: Request, res: Response): Promise<void> {
  const isSuperAdmin = req.user!.role === 'super_admin';
  await pinService.invalidatePin(req.params.id!, req.user!.id, isSuperAdmin);
  await auditService.logAudit({
    actorId: req.user!.id,
    action: 'pin_invalidated',
    entityType: 'onboarding_pin',
    entityId: req.params.id,
    ipAddress: req.ip,
  });
  sendSuccess(res, null, HTTP_STATUS.OK, 'PIN invalidated');
}

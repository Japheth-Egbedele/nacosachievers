import type { Request, Response } from 'express';
import { HTTP_STATUS } from '../constants/http.js';
import { ValidationError } from '../utils/errors.js';
import { sendSuccess } from '../utils/response.js';
import * as auditService from '../services/audit.service.js';
import * as pinService from '../services/pin.service.js';
import {
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

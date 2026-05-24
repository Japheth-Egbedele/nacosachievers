import type { Request, Response } from 'express';
import { HTTP_STATUS } from '../constants/http.js';
import { sendSuccess } from '../utils/response.js';
import * as pinService from '../services/pin.service.js';

/**
 * POST /admin/pins/generate
 */
export async function generatePin(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    matric_number: string;
    department_id?: string;
    level_of_entry?: string;
    admission_type?: string;
  };
  const result = await pinService.createPin({
    matricNumber: body.matric_number,
    createdBy: req.user!.id,
    departmentId: body.department_id,
    levelOfEntry: body.level_of_entry,
    admissionType: body.admission_type,
  });
  sendSuccess(
    res,
    { id: result.id, pin: result.pin, matric_number: body.matric_number },
    HTTP_STATUS.CREATED,
    'PIN generated. Share securely with the member.',
  );
}

/**
 * POST /admin/pins/invalidate/:id
 */
export async function invalidatePin(req: Request, res: Response): Promise<void> {
  await pinService.invalidatePin(req.params.id!);
  sendSuccess(res, null, HTTP_STATUS.OK, 'PIN invalidated');
}

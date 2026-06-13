import type { Request, Response } from 'express';
import { HTTP_STATUS } from '../constants/http.js';
import { ValidationError } from '../utils/errors.js';
import { sendPaginated, sendSuccess } from '../utils/response.js';
import * as userService from '../services/user.service.js';
import * as auditService from '../services/audit.service.js';
import * as sessionPromotionService from '../services/session-promotion.service.js';

/**
 * GET /users/me
 */
export async function getMe(req: Request, res: Response): Promise<void> {
  const data = await userService.getMe(req.user!.id);
  sendSuccess(res, data);
}

/**
 * PATCH /users/me
 */
export async function updateMe(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    display_name?: string;
    bio?: string;
    linkedin_url?: string | null;
    github_url?: string | null;
    email_visible?: boolean;
    notification_prefs?: Record<string, unknown>;
  };
  const data = await userService.updateMe(req.user!.id, {
    display_name: body.display_name,
    bio: body.bio,
    linkedin_url: body.linkedin_url,
    github_url: body.github_url,
    email_visible: body.email_visible,
    notification_prefs: body.notification_prefs,
  });
  sendSuccess(res, data);
}

/**
 * PATCH /users/me/password
 */
export async function changePassword(req: Request, res: Response): Promise<void> {
  const { current_password, new_password } = req.body as {
    current_password: string;
    new_password: string;
  };
  await userService.changePassword(req.user!.id, current_password, new_password);
  sendSuccess(res, null, HTTP_STATUS.OK, 'Password updated');
}

/**
 * DELETE /users/me
 */
export async function deleteMe(req: Request, res: Response): Promise<void> {
  const { password } = req.body as { password: string };
  await userService.deactivateSelf(req.user!.id, password);
  await auditService.logAudit({
    actorId: req.user!.id,
    action: 'user_deactivated_self',
    entityType: 'user',
    entityId: req.user!.id,
    ipAddress: req.ip,
  });
  sendSuccess(res, null, HTTP_STATUS.OK, 'Account deactivated');
}

/**
 * GET /users/:id/profile
 */
export async function getProfile(req: Request, res: Response): Promise<void> {
  const data = await userService.getPublicProfile(req.params.id!);
  sendSuccess(res, data);
}

/**
 * GET /users/alumni
 */
export async function listAlumni(req: Request, res: Response): Promise<void> {
  const { items, meta } = await userService.listAlumni(req.query);
  sendPaginated(res, items, meta);
}

/**
 * GET /users/leaderboard
 */
export async function leaderboard(_req: Request, res: Response): Promise<void> {
  const data = await userService.getLeaderboard();
  sendSuccess(res, data);
}

/**
 * POST /users/me/photo
 */
export async function uploadPhoto(req: Request, res: Response): Promise<void> {
  const file = req.file;
  if (!file) throw new ValidationError('Photo file is required');
  const data = await userService.uploadProfilePhoto(
    req.user!.id,
    file.buffer,
    file.mimetype,
    file.originalname,
  );
  sendSuccess(res, data, HTTP_STATUS.OK, 'Profile photo updated');
}

/**
 * DELETE /users/me/photo
 */
export async function deletePhoto(req: Request, res: Response): Promise<void> {
  const data = await userService.deleteProfilePhoto(req.user!.id);
  sendSuccess(res, data, HTTP_STATUS.OK, 'Profile photo removed');
}

/** GET /users/lookup — search members for wallet transfer etc. */
export async function lookupUsers(req: Request, res: Response): Promise<void> {
  const search = String(req.query.search ?? '');
  const limit = req.query.limit ? Number(req.query.limit) : 20;
  const data = await sessionPromotionService.lookupUsers(search, limit);
  const role = req.user!.role;
  const isAdmin = role === 'super_admin' || role === 'executive';
  const sanitized = isAdmin
    ? data
    : data.map(({ email: _email, ...rest }) => rest);
  sendSuccess(res, sanitized);
}

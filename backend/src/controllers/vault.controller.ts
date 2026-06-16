import type { Request, Response } from 'express';
import { HTTP_STATUS } from '../constants/http.js';
import { sendPaginated, sendSuccess } from '../utils/response.js';
import * as vaultService from '../services/vault.service.js';
import * as walletService from '../services/wallet.service.js';
import type { UploadKind } from '../constants/enums.js';

export async function listCourses(req: Request, res: Response): Promise<void> {
  const { items, meta } = await vaultService.listCourses(req.query);
  sendPaginated(res, items, meta);
}

export async function getCourse(req: Request, res: Response): Promise<void> {
  const sessionId = req.query.session_id as string | undefined;
  const data = await vaultService.getCourseDetail(req.params.id!, sessionId);
  sendSuccess(res, data);
}

export async function createCourse(req: Request, res: Response): Promise<void> {
  const data = await vaultService.createCourse(req.body, req.user!.id);
  sendSuccess(res, data, HTTP_STATUS.CREATED);
}

export async function updateCourse(req: Request, res: Response): Promise<void> {
  const data = await vaultService.updateCourse(req.params.id!, req.body);
  sendSuccess(res, data);
}

export async function deleteCourse(req: Request, res: Response): Promise<void> {
  await vaultService.deleteCourse(req.params.id!);
  sendSuccess(res, null, HTTP_STATUS.OK, 'Course deleted');
}

export async function getUploadLimits(_req: Request, res: Response): Promise<void> {
  const data = await vaultService.getUploadLimits();
  sendSuccess(res, data);
}

export async function checkDuplicate(req: Request, res: Response): Promise<void> {
  const q = req.query as {
    course_id?: string;
    upload_kind?: UploadKind;
    file_name?: string;
    content_hash?: string;
  };
  const data = await vaultService.checkDuplicate({
    courseId: q.course_id!,
    uploadKind: q.upload_kind!,
    fileName: q.file_name,
    contentHash: q.content_hash,
  });
  sendSuccess(res, data);
}

export async function initUpload(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    course_id: string;
    title: string;
    description?: string;
    upload_kind: UploadKind;
    content_hash?: string;
    files: { file_name: string; content_mime: string; file_size_bytes: number }[];
  };
  const data = await vaultService.initUpload({
    uploaderId: req.user!.id,
    courseId: body.course_id,
    title: body.title,
    description: body.description,
    uploadKind: body.upload_kind,
    contentHash: body.content_hash,
    files: body.files,
  });
  sendSuccess(res, data, HTTP_STATUS.CREATED);
}

export async function completeUpload(req: Request, res: Response): Promise<void> {
  const data = await vaultService.completeUpload({
    uploadId: req.params.id!,
    uploaderId: req.user!.id,
  });
  sendSuccess(res, data);
}

export async function uploadFile(req: Request, res: Response): Promise<void> {
  const file = req.file;
  if (!file) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'PDF file required' });
    return;
  }
  const body = req.body as {
    course_id: string;
    title: string;
    description?: string;
    upload_kind?: UploadKind;
  };
  const data = await vaultService.createUpload({
    uploaderId: req.user!.id,
    courseId: body.course_id,
    title: body.title,
    description: body.description,
    file: file.buffer,
    fileName: file.originalname,
    uploadKind: body.upload_kind,
  });
  sendSuccess(res, data, HTTP_STATUS.CREATED);
}

export async function listUploads(req: Request, res: Response): Promise<void> {
  const { items, meta } = await vaultService.listApprovedUploads(req.query);
  sendPaginated(res, items, meta);
}

export async function listMyUploads(req: Request, res: Response): Promise<void> {
  const { items, meta } = await vaultService.listMyUploads(req.user!.id, req.query);
  sendPaginated(res, items, meta);
}

export async function downloadUpload(req: Request, res: Response): Promise<void> {
  const fileId = req.query.file_id as string | undefined;
  const data = await vaultService.getDownloadUrl(req.params.id!, fileId);
  sendSuccess(res, data);
}

export async function listUploadFiles(req: Request, res: Response): Promise<void> {
  const data = await vaultService.getUploadFilesSigned(req.params.id!);
  sendSuccess(res, data);
}

export async function deleteUpload(req: Request, res: Response): Promise<void> {
  const isAdmin = ['executive', 'super_admin'].includes(req.user!.role);
  await vaultService.deleteUpload(req.params.id!, req.user!.id, isAdmin);
  sendSuccess(res, null, HTTP_STATUS.OK, 'Upload deleted');
}

export async function getTreasurySummary(_req: Request, res: Response): Promise<void> {
  const data = await walletService.getTreasurySummary();
  sendSuccess(res, data);
}

export async function listPending(_req: Request, res: Response): Promise<void> {
  const data = await vaultService.listPending();
  sendSuccess(res, data);
}

export async function moveUpload(req: Request, res: Response): Promise<void> {
  const body = req.body as { course_id: string; title?: string };
  await vaultService.adminMoveUpload({
    uploadId: req.params.id!,
    courseId: body.course_id,
    title: body.title,
  });
  sendSuccess(res, null, HTTP_STATUS.OK);
}

export async function reviewUpload(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    status: 'approved' | 'rejected';
    rejection_reason?: string;
    credit_amount?: number;
  };
  await vaultService.reviewUpload({
    uploadId: req.params.id!,
    reviewerId: req.user!.id,
    status: body.status,
    rejectionReason: body.rejection_reason,
    creditAmount: body.credit_amount,
  });
  sendSuccess(res, null, HTTP_STATUS.OK);
}

export async function previewUpload(req: Request, res: Response): Promise<void> {
  const data = await vaultService.getAdminPreviewUrls(req.params.id!);
  sendSuccess(res, data);
}

export async function bulkApproveUploads(req: Request, res: Response): Promise<void> {
  const body = req.body as { upload_ids: string[]; credit_amount?: number };
  const data = await vaultService.bulkApproveUploads({
    uploadIds: body.upload_ids,
    reviewerId: req.user!.id,
    creditAmount: body.credit_amount,
  });
  sendSuccess(res, data);
}

export async function bulkDeleteUploads(req: Request, res: Response): Promise<void> {
  const body = req.body as { upload_ids: string[] };
  const data = await vaultService.bulkDeleteUploads({
    uploadIds: body.upload_ids,
    actorId: req.user!.id,
  });
  sendSuccess(res, data);
}

export async function flagUpload(req: Request, res: Response): Promise<void> {
  const { reason } = req.body as { reason: string };
  await vaultService.flagUpload(req.params.id!, req.user!.id, reason);
  sendSuccess(res, null, HTTP_STATUS.CREATED);
}

export async function listFlags(_req: Request, res: Response): Promise<void> {
  const data = await vaultService.listFlags();
  sendSuccess(res, data);
}

export async function resolveFlag(req: Request, res: Response): Promise<void> {
  await vaultService.resolveFlag(req.params.id!, req.user!.id);
  sendSuccess(res, null, HTTP_STATUS.OK);
}

export async function listLecturers(_req: Request, res: Response): Promise<void> {
  const data = await vaultService.listLecturers();
  sendSuccess(res, data);
}

export async function createLecturer(req: Request, res: Response): Promise<void> {
  const data = await vaultService.createLecturer(req.body);
  sendSuccess(res, data, HTTP_STATUS.CREATED);
}

export async function updateLecturer(req: Request, res: Response): Promise<void> {
  const data = await vaultService.updateLecturer(req.params.id!, req.body);
  sendSuccess(res, data);
}

export async function deleteLecturer(req: Request, res: Response): Promise<void> {
  await vaultService.deleteLecturer(req.params.id!);
  sendSuccess(res, null, HTTP_STATUS.OK);
}

export async function createAssignment(req: Request, res: Response): Promise<void> {
  const data = await vaultService.createAssignment(
    req.params.id!,
    req.body,
    req.user!.id,
  );
  sendSuccess(res, data, HTTP_STATUS.CREATED);
}

export async function updateAssignment(req: Request, res: Response): Promise<void> {
  const data = await vaultService.updateAssignment(req.params.id!, req.body);
  sendSuccess(res, data);
}

export async function deleteAssignment(req: Request, res: Response): Promise<void> {
  await vaultService.deleteAssignment(req.params.id!);
  sendSuccess(res, null, HTTP_STATUS.OK);
}

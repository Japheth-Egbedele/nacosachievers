import type { Request, Response } from 'express';
import { sendSuccess } from '../utils/response.js';
import * as storageService from '../services/storage.service.js';

let cachedUsage: { at: number; data: Awaited<ReturnType<typeof storageService.getStorageUsage>> } | null = null;
const CACHE_MS = 5 * 60 * 1000;

/**
 * GET /admin/storage/usage
 */
export async function getStorageUsage(_req: Request, res: Response): Promise<void> {
  const now = Date.now();
  if (cachedUsage && now - cachedUsage.at < CACHE_MS) {
    sendSuccess(res, cachedUsage.data);
    return;
  }
  const data = await storageService.getStorageUsage();
  cachedUsage = { at: now, data };
  sendSuccess(res, data);
}

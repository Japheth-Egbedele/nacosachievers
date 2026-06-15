import type { Request, Response } from 'express';
import { HTTP_STATUS } from '../constants/http.js';
import { sendPaginated, sendSuccess } from '../utils/response.js';
import * as walletService from '../services/wallet.service.js';

/**
 * GET /admin/wallet/transactions
 */
export async function listTransactions(req: Request, res: Response): Promise<void> {
  const { items, meta } = await walletService.listAdminTransactions(req.query);
  sendPaginated(res, items, meta);
}

/**
 * POST /admin/wallet/credit
 */
export async function bulkCredit(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    remark: string;
    credits: { user_id: string; amount: number }[];
  };
  const result = await walletService.bulkCredit({
    actorId: req.user!.id,
    remark: body.remark,
    credits: body.credits,
  });
  sendSuccess(res, result, HTTP_STATUS.OK, 'Credits applied');
}

/**
 * GET /admin/wallet/treasury
 */
export async function getTreasury(_req: Request, res: Response): Promise<void> {
  const data = await walletService.getTreasurySummary();
  sendSuccess(res, data);
}

/**
 * POST /admin/wallet/treasury/fund
 */
export async function fundTreasury(req: Request, res: Response): Promise<void> {
  const body = req.body as { amount: number; remark: string };
  const data = await walletService.fundTreasury({
    actorId: req.user!.id,
    amount: body.amount,
    remark: body.remark,
  });
  sendSuccess(res, data, HTTP_STATUS.OK, 'Treasury funded');
}

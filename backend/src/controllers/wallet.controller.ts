import type { Request, Response } from 'express';
import { HTTP_STATUS } from '../constants/http.js';
import { sendPaginated, sendSuccess } from '../utils/response.js';
import * as walletService from '../services/wallet.service.js';

/**
 * GET /wallet/balance
 */
export async function getBalance(req: Request, res: Response): Promise<void> {
  const data = await walletService.getBalance(req.user!.id);
  sendSuccess(res, data);
}

/**
 * GET /wallet/transactions
 */
export async function listTransactions(req: Request, res: Response): Promise<void> {
  const { items, meta } = await walletService.listUserTransactions(req.user!.id, req.query);
  sendPaginated(res, items, meta);
}

/**
 * POST /wallet/transfer
 */
export async function transfer(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    recipient_id: string;
    amount: number;
    remark: string;
  };
  await walletService.transferCredits({
    senderId: req.user!.id,
    receiverId: body.recipient_id,
    amount: body.amount,
    remark: body.remark,
  });
  sendSuccess(res, null, HTTP_STATUS.OK, 'Transfer completed');
}

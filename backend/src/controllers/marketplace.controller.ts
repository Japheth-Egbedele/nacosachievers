import type { Request, Response } from 'express';
import { HTTP_STATUS } from '../constants/http.js';
import { sendPaginated, sendSuccess } from '../utils/response.js';
import * as marketplaceService from '../services/marketplace.service.js';

/**
 * GET /marketplace/items
 */
export async function listItems(req: Request, res: Response): Promise<void> {
  const { items, meta } = await marketplaceService.listItems(req.query);
  sendPaginated(res, items, meta);
}

/**
 * GET /marketplace/items/:id
 */
export async function getItem(req: Request, res: Response): Promise<void> {
  const data = await marketplaceService.getItem(req.params.id!);
  sendSuccess(res, data);
}

/**
 * POST /marketplace/redeem
 */
export async function redeem(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    item_id: string;
    quantity: number;
    remark: string;
  };
  const data = await marketplaceService.redeemItem({
    userId: req.user!.id,
    itemId: body.item_id,
    quantity: body.quantity ?? 1,
    remark: body.remark,
  });
  sendSuccess(res, data, HTTP_STATUS.CREATED, 'Redemption successful');
}

/**
 * GET /marketplace/orders/mine
 */
export async function listMyOrders(req: Request, res: Response): Promise<void> {
  const { items, meta } = await marketplaceService.listMyOrders(req.user!.id, req.query);
  sendPaginated(res, items, meta);
}

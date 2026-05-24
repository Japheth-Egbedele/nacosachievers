import type { Request, Response } from 'express';
import { HTTP_STATUS } from '../constants/http.js';
import { sendPaginated, sendSuccess } from '../utils/response.js';
import * as marketplaceService from '../services/marketplace.service.js';

/**
 * POST /admin/marketplace/items
 */
export async function createItem(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    name: string;
    description?: string;
    price_in_credits: number;
    item_type: 'digital' | 'physical';
    stock_count?: number | null;
    digital_delivery_content?: string;
  };
  const data = await marketplaceService.createItem(
    {
      name: body.name,
      description: body.description,
      price_in_credits: body.price_in_credits,
      item_type: body.item_type,
      stock_count: body.stock_count,
      digital_delivery_content: body.digital_delivery_content,
      createdBy: req.user!.id,
    },
    req.file,
  );
  sendSuccess(res, data, HTTP_STATUS.CREATED);
}

/**
 * PATCH /admin/marketplace/items/:id
 */
export async function updateItem(req: Request, res: Response): Promise<void> {
  const data = await marketplaceService.updateItem(req.params.id!, req.body, req.file);
  sendSuccess(res, data);
}

/**
 * DELETE /admin/marketplace/items/:id
 */
export async function deleteItem(req: Request, res: Response): Promise<void> {
  await marketplaceService.deleteItem(req.params.id!);
  sendSuccess(res, null, HTTP_STATUS.OK, 'Item removed');
}

/**
 * GET /admin/marketplace/orders
 */
export async function listOrders(req: Request, res: Response): Promise<void> {
  const { items, meta } = await marketplaceService.listAdminOrders(req.query);
  sendPaginated(res, items, meta);
}

/**
 * PATCH /admin/marketplace/orders/:id/fulfill
 */
export async function fulfillOrder(req: Request, res: Response): Promise<void> {
  const { fulfillment_note } = req.body as { fulfillment_note: string };
  await marketplaceService.fulfillOrder(req.params.id!, req.user!.id, fulfillment_note);
  sendSuccess(res, null, HTTP_STATUS.OK, 'Order fulfilled');
}

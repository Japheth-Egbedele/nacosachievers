import { z } from 'zod';

export const marketplaceItemsQuerySchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  item_type: z.enum(['digital', 'physical']).optional(),
  in_stock_only: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});

export const redeemSchema = z.object({
  item_id: z.string().uuid(),
  quantity: z.coerce.number().int().positive().default(1),
  remark: z.string().min(3).max(500),
});

export const ordersMineQuerySchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
});

export const createItemSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  price_in_credits: z.coerce.number().int().positive(),
  item_type: z.enum(['digital', 'physical']),
  stock_count: z.coerce.number().int().nonnegative().nullable().optional(),
  digital_delivery_content: z.string().max(10000).optional(),
});

export const updateItemSchema = createItemSchema.partial();

export const adminOrdersQuerySchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  status: z.enum(['pending', 'fulfilled', 'cancelled']).optional(),
});

export const fulfillOrderSchema = z.object({
  fulfillment_note: z.string().min(1).max(2000),
});

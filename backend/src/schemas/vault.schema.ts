import { z } from 'zod';

export const bulkApproveSchema = z.object({
  upload_ids: z.array(z.string().uuid()).min(1).max(100),
  credit_amount: z.coerce.number().int().min(0).max(500).optional(),
});

export const bulkDeleteSchema = z.object({
  upload_ids: z.array(z.string().uuid()).min(1).max(100),
});

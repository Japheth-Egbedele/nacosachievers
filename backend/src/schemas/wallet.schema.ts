import { z } from 'zod';
import { TRANSACTION_TYPES } from '../constants/enums.js';

export const walletTransactionsQuerySchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  type: z.enum(TRANSACTION_TYPES).optional(),
});

export const transferSchema = z.object({
  recipient_id: z.string().uuid(),
  amount: z.coerce.number().int().positive(),
  remark: z.string().min(3).max(500),
});

export const adminWalletTransactionsQuerySchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  user_id: z.string().uuid().optional(),
  type: z.enum(TRANSACTION_TYPES).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const bulkCreditSchema = z.object({
  remark: z.string().min(3).max(500),
  credits: z
    .array(
      z.object({
        user_id: z.string().uuid(),
        amount: z.coerce.number().int().positive(),
      }),
    )
    .min(1)
    .max(100),
});

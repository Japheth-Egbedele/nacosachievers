import { z } from 'zod';

export const vaultFlagSchema = z.object({
  reason: z.string().trim().min(4).max(500),
});


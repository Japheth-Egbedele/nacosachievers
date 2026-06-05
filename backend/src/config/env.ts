import { z } from 'zod';

/** Trim, strip quotes, and add https:// when Render omits the scheme. */
function normalizeUrl(value: unknown): string {
  if (typeof value !== 'string') return '';
  let url = value.trim().replace(/^["']|["']$/g, '');
  if (url && !/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  return url;
}

const frontendUrlSchema = z
  .string()
  .transform(normalizeUrl)
  .pipe(
    z.string().url({
      message:
        'Must be one full URL with https:// — not comma-separated (use CORS_ORIGINS for extras)',
    }),
  )
  .transform((url) => url.replace(/\/+$/, ''));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  JWT_PRIVATE_KEY: z.string().min(1),
  JWT_PUBLIC_KEY: z.string().min(1),
  REFRESH_TOKEN_SECRET: z.string().min(32),
  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM_EMAIL: z.string().email(),
  FRONTEND_URL: frontendUrlSchema,
  /** Comma-separated extra browser origins (Vercel preview URL, apex domain, etc.) */
  CORS_ORIGINS: z.string().optional(),
  CRON_SECRET: z.string().min(16),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validates and returns typed environment config. Crashes on missing/invalid vars.
 * @returns Parsed environment configuration
 */
export function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${formatted}`);
  }
  return result.data;
}

export const env = loadEnv();

/** Canonical site URL for email links + primary CORS origin. */
export function getCorsOrigins(): string[] {
  const extras =
    env.CORS_ORIGINS?.split(',')
      .map((o) => o.trim().replace(/\/+$/, ''))
      .filter(Boolean) ?? [];
  return [...new Set([env.FRONTEND_URL, ...extras])];
}

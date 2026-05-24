import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env.js';

let supabase: SupabaseClient | null = null;

/**
 * Returns the Supabase service-role client singleton.
 * @returns Supabase client with service role privileges
 */
export function getSupabase(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return supabase;
}

/**
 * Lightweight DB connectivity check for health endpoint.
 * @returns true if a simple query succeeds
 */
export async function pingDatabase(): Promise<boolean> {
  const { error } = await getSupabase().from('departments').select('id').limit(1);
  return !error;
}

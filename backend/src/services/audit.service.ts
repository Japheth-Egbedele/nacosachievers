import { getSupabase } from '../config/supabase.js';

export async function logAudit(input: {
  actorId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}): Promise<void> {
  await getSupabase()
    .from('audit_logs')
    .insert({
      actor_id: input.actorId ?? null,
      action: input.action,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      metadata: input.metadata ?? {},
      ip_address: input.ipAddress ?? null,
    })
    .then(({ error }) => {
      if (error) {
        // Non-blocking — voting/onboarding must not fail if audit insert fails
        console.error('audit_log insert failed', error.message);
      }
    });
}

export async function listAuditLogs(query: { page?: number; limit?: number; action?: string }) {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 30));
  const offset = (page - 1) * limit;

  let q = getSupabase()
    .from('audit_logs')
    .select('id, actor_id, action, entity_type, entity_id, metadata, ip_address, created_at', {
      count: 'exact',
    })
    .order('created_at', { ascending: false });

  if (query.action) q = q.eq('action', query.action);

  const { data, count, error } = await q.range(offset, offset + limit - 1);
  if (error) throw error;

  return {
    items: data ?? [],
    meta: { total: count ?? 0, page, limit },
  };
}

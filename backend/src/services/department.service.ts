import { getSupabase } from '../config/supabase.js';

export async function listDepartments() {
  const { data, error } = await getSupabase()
    .from('departments')
    .select('id, name, code')
    .order('name', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

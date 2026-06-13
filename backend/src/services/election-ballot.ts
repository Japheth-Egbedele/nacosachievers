import { getSupabase } from '../config/supabase.js';
import { ForbiddenError, ValidationError } from '../utils/errors.js';

export type VoteSelection =
  | { position_id: string; choice: 'candidate'; candidate_id: string }
  | { position_id: string; choice: 'abstain' };

export async function userHasBallot(electionId: string, userId: string): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from('election_ballots')
    .select('id')
    .eq('election_id', electionId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error?.code === '42P01') {
    throw new ValidationError(
      'Election ballot schema is incomplete. Run MANUAL_SETUP §2.22.2 in Supabase.',
      'ELECTION_SCHEMA_INCOMPLETE',
    );
  }
  if (error) throw error;
  return Boolean(data);
}

export async function assertElectionDepartmentAccess(
  userId: string,
  scope: string | null | undefined,
  departmentId: string | null | undefined,
): Promise<void> {
  if (scope !== 'department' || !departmentId) return;
  const { data } = await getSupabase()
    .from('users')
    .select('department_id')
    .eq('id', userId)
    .maybeSingle();
  if (data?.department_id !== departmentId) {
    throw new ForbiddenError('This election is for another department');
  }
}

export async function fetchAbstentionCounts(
  electionId: string,
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const { data, error } = await getSupabase()
    .from('election_position_abstentions')
    .select('position_id')
    .eq('election_id', electionId);
  if (error?.code === '42P01') return map;
  if (error) throw error;
  for (const row of data ?? []) {
    const pid = row.position_id as string;
    map.set(pid, (map.get(pid) ?? 0) + 1);
  }
  return map;
}

export async function fetchUserBallotSelections(
  electionId: string,
  userId: string,
): Promise<{ candidate_ids: string[]; abstained_position_ids: string[] } | null> {
  const hasBallot = await userHasBallot(electionId, userId);
  if (!hasBallot) return null;

  const [{ data: votes }, { data: abstentions }] = await Promise.all([
    getSupabase()
      .from('election_votes')
      .select('candidate_id')
      .eq('election_id', electionId)
      .eq('user_id', userId),
    getSupabase()
      .from('election_position_abstentions')
      .select('position_id')
      .eq('election_id', electionId)
      .eq('user_id', userId),
  ]);

  return {
    candidate_ids: (votes ?? []).map((v) => v.candidate_id as string),
    abstained_position_ids: (abstentions ?? []).map((a) => a.position_id as string),
  };
}

export async function rollbackBallot(electionId: string, userId: string): Promise<void> {
  await getSupabase()
    .from('election_ballots')
    .delete()
    .eq('election_id', electionId)
    .eq('user_id', userId);
}

export async function countBallotsCast(electionId: string): Promise<number> {
  const { count, error } = await getSupabase()
    .from('election_ballots')
    .select('id', { count: 'exact', head: true })
    .eq('election_id', electionId);
  if (error?.code === '42P01') {
    const { count: voteCount } = await getSupabase()
      .from('election_votes')
      .select('user_id', { count: 'exact', head: true })
      .eq('election_id', electionId);
    return voteCount ?? 0;
  }
  if (error) throw error;
  return count ?? 0;
}

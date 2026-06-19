import { getSupabase } from '../config/supabase.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/errors.js';
import { assertImageMagic } from '../utils/file-validation.js';
import { MEMBER_LEVEL_BUCKETS } from '../utils/member-scope.js';
import { optimizeImageUrl } from './user.service.js';
import * as storageService from './storage.service.js';
import {
  assertElectionDepartmentAccess,
  countBallotsCast,
  fetchAbstentionCounts,
  fetchUserBallotSelections,
  rollbackBallot,
  userHasBallot,
  type VoteSelection,
} from './election-ballot.js';
import { buildPositionResults, collectStrongestWins } from './election-results.util.js';
import { ELECTION_VOTER_ROLES, isElectionVoterRole } from '../utils/election-voters.js';

export type { VoteSelection };
export { buildPositionResults };

type SupabaseErrorLike = { code?: string; message?: string };

/** Maps missing election_positions / view errors to an actionable admin message. */
function rethrowElectionDbError(error: SupabaseErrorLike): never {
  const msg = error.message ?? '';
  if (
    error.code === '42P01' ||
    error.code === '42703' ||
    msg.includes('election_positions') ||
    msg.includes('position_id') ||
    msg.includes('elections_with_status')
  ) {
    throw new ValidationError(
      'Election schema is incomplete. Run MANUAL_SETUP §2.22.1 in the Supabase SQL Editor, then retry.',
      'ELECTION_SCHEMA_INCOMPLETE',
    );
  }
  throw error;
}

type ElectionStatus = 'active' | 'upcoming' | 'completed';

interface ElectionRow {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  require_all_positions?: boolean;
  scope?: string | null;
  department_id?: string | null;
  status?: ElectionStatus;
}

interface PositionRow {
  id: string;
  election_id: string;
  title: string;
  sort_order: number;
}

interface CandidateRow {
  id: string;
  election_id: string;
  position_id: string;
  name: string;
  position: string;
  manifesto: string | null;
  image_url: string | null;
}

function computeStatus(startDate: string, endDate: string): ElectionStatus {
  const now = Date.now();
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  if (now < start) return 'upcoming';
  if (now >= end) return 'completed';
  return 'active';
}

async function getElectionRow(electionId: string): Promise<ElectionRow & { status: ElectionStatus }> {
  const { data, error } = await getSupabase()
    .from('elections_with_status')
    .select('*')
    .eq('id', electionId)
    .maybeSingle();

  if (error) rethrowElectionDbError(error);
  if (!data) throw new NotFoundError('Election not found');
  const status = (data.status as ElectionStatus) ?? computeStatus(data.start_date, data.end_date);
  return { ...data, status };
}

function assertStructureEditable(status: ElectionStatus): void {
  if (status !== 'upcoming') {
    throw new ValidationError('Positions and contestants can only be edited before the election goes live');
  }
}

async function assertUserCanVote(userId: string): Promise<void> {
  const { data } = await getSupabase()
    .from('users')
    .select('is_email_verified, is_active, role')
    .eq('id', userId)
    .single();

  if (!data?.is_active) throw new ForbiddenError('Account is not active');
  if (!data.is_email_verified) {
    throw new ForbiddenError('Please verify your email before voting');
  }
  if (data.role === 'guest') throw new ForbiddenError('Not eligible to vote');
  if (data.role === 'staff') {
    throw new ForbiddenError('Lecturers and staff cannot vote in chapter elections');
  }
  if (data.role === 'alumni') {
    throw new ForbiddenError('Alumni cannot vote in chapter student elections');
  }
  if (data.role === 'super_admin') {
    throw new ForbiddenError('Super admin accounts cannot vote; use a student test account');
  }
}

function isVoterRole(role: string): boolean {
  return isElectionVoterRole(role);
}

async function fetchPositions(electionId: string): Promise<PositionRow[]> {
  const { data, error } = await getSupabase()
    .from('election_positions')
    .select('id, election_id, title, sort_order')
    .eq('election_id', electionId)
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true });

  if (error) rethrowElectionDbError(error);
  return data ?? [];
}

function publicCandidateImage(url: string | null): string | null {
  return optimizeImageUrl(url);
}

async function deleteCandidateImage(imageUrl: string | null): Promise<void> {
  if (!imageUrl) return;
  const path = storageService.extractPathFromUrl(imageUrl, 'public-images');
  await storageService.deleteFile('public-images', path).catch(() => undefined);
}

async function uploadCandidateImage(
  electionId: string,
  candidateId: string,
  file: Express.Multer.File,
): Promise<string> {
  assertImageMagic(file.buffer);
  const ext =
    file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg';
  const path = `elections/${electionId}/${candidateId}.${ext}`;
  return storageService.uploadFile('public-images', path, file.buffer, file.mimetype);
}

async function fetchCandidates(electionId: string): Promise<CandidateRow[]> {
  const { data, error } = await getSupabase()
    .from('election_candidates')
    .select('id, election_id, position_id, name, position, manifesto, image_url')
    .eq('election_id', electionId)
    .order('created_at', { ascending: true });

  if (error) rethrowElectionDbError(error);
  return data ?? [];
}

async function countEligibleVoters(): Promise<number> {
  const { count, error } = await getSupabase()
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .eq('is_email_verified', true)
    .in('role', [...ELECTION_VOTER_ROLES]);

  if (error) throw error;
  return count ?? 0;
}

function buildVoteCounts(voteRows: { candidate_id: string; user_id: string }[]) {
  const countByCandidate = new Map<string, number>();
  const voterIds = new Set<string>();
  for (const v of voteRows) {
    countByCandidate.set(v.candidate_id, (countByCandidate.get(v.candidate_id) ?? 0) + 1);
    voterIds.add(v.user_id);
  }
  return { countByCandidate, uniqueVoters: voterIds.size };
}

export async function getDashboard(userId: string) {
  const elections = await listElectionsForUser(userId);
  const active = elections.filter((e) => e.status === 'active');
  const upcoming = elections.filter((e) => e.status === 'upcoming');
  const completed = elections.filter((e) => e.status === 'completed');
  const votedCount = elections.filter((e) => e.user_has_voted).length;

  const { data: user } = await getSupabase()
    .from('users')
    .select('id, email, first_name, last_name, display_name, matric_number, role')
    .eq('id', userId)
    .single();

  return {
    user: user
      ? {
          id: user.id,
          email: user.email,
          full_name: user.display_name ?? `${user.first_name} ${user.last_name}`,
          student_id: user.matric_number,
          role: user.role,
        }
      : null,
    stats: {
      active_elections: active.length,
      upcoming_elections: upcoming.length,
      completed_elections: completed.length,
      total_votes_cast: votedCount,
    },
    active_elections: active,
    upcoming_elections: upcoming,
    recent_elections: elections.slice(0, 5),
  };
}

export async function listElectionsForUser(userId: string, statusFilter?: ElectionStatus) {
  const { data: userRow } = await getSupabase()
    .from('users')
    .select('department_id')
    .eq('id', userId)
    .maybeSingle();

  const departmentId = userRow?.department_id ?? null;

  const { data: elections, error } = await getSupabase()
    .from('elections_with_status')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const visible = (elections ?? []).filter((e) => {
    const scope = (e.scope as string | null) ?? 'chapter';
    if (scope === 'chapter') return true;
    if (scope === 'department' && departmentId && e.department_id === departmentId) return true;
    return false;
  });

  const ballotChecks = await Promise.all(
    visible.map(async (e) => ({
      id: e.id as string,
      voted: await userHasBallot(e.id as string, userId),
    })),
  );
  const votedSet = new Set(ballotChecks.filter((b) => b.voted).map((b) => b.id));

  let enriched = visible.map((e) => ({
    ...e,
    user_has_voted: votedSet.has(e.id as string),
  }));

  if (statusFilter) {
    enriched = enriched.filter((e) => e.status === statusFilter);
  }

  return enriched;
}

async function fetchUserRole(userId: string): Promise<string> {
  const { data } = await getSupabase().from('users').select('role').eq('id', userId).single();
  return data?.role ?? 'guest';
}

export async function getElectionDetail(electionId: string, userId: string) {
  const election = await getElectionRow(electionId);
  await assertElectionDepartmentAccess(userId, election.scope, election.department_id);

  const userRole = await fetchUserRole(userId);
  const canVote = isVoterRole(userRole);
  const positions = await fetchPositions(electionId);
  const candidates = await fetchCandidates(electionId);

  const { data: voteRows } = await getSupabase()
    .from('election_votes')
    .select('candidate_id, user_id')
    .eq('election_id', electionId);

  const { countByCandidate } = buildVoteCounts(voteRows ?? []);
  const abstentionCounts = await fetchAbstentionCounts(electionId);
  const uniqueVoters = await countBallotsCast(electionId);

  const userBallot = await fetchUserBallotSelections(electionId, userId);
  const ballotLocked = userBallot !== null;
  const showCounts = election.status === 'completed';

  const positionsWithCandidates = positions.map((pos) => ({
    id: pos.id,
    title: pos.title,
    sort_order: pos.sort_order,
    candidates: candidates
      .filter((c) => c.position_id === pos.id)
      .map((c) => ({
        id: c.id,
        name: c.name,
        manifesto: c.manifesto,
        image_url: publicCandidateImage(c.image_url),
        ...(showCounts ? { vote_count: countByCandidate.get(c.id) ?? 0 } : {}),
      })),
  }));

  const contestable = positionsWithCandidates.filter((p) => p.candidates.length > 0);

  const payload: Record<string, unknown> = {
    election: {
      id: election.id,
      title: election.title,
      description: election.description,
      status: election.status,
      start_date: election.start_date,
      end_date: election.end_date,
      scope: election.scope ?? 'chapter',
      department_id: election.department_id ?? null,
      require_all_positions: election.require_all_positions ?? true,
    },
    positions: positionsWithCandidates,
    contestable_positions: contestable.length,
    user_vote: ballotLocked ? userBallot : null,
    ballot_locked: ballotLocked,
    can_vote: canVote && election.status === 'active' && !ballotLocked,
  };

  if (showCounts) {
    const optimizedCandidates = candidates.map((c) => ({
      ...c,
      image_url: publicCandidateImage(c.image_url),
    }));
    const eligibleVoters = await countEligibleVoters();
    const positionResults = buildPositionResults(
      positions,
      optimizedCandidates,
      countByCandidate,
      abstentionCounts,
      eligibleVoters,
    );
    const analytics = await buildAnalytics(uniqueVoters, positions, candidates);
    const extended = await buildExtendedAnalytics(electionId, positionResults, uniqueVoters);
    payload.results = {
      positions: positionResults,
      analytics: { ...analytics, extended },
    };
  }

  return payload;
}

async function buildAnalytics(
  uniqueVoters: number,
  positions: PositionRow[],
  candidates: CandidateRow[],
) {
  const eligible = await countEligibleVoters();
  const contestable = positions.filter((p) =>
    candidates.some((c) => c.position_id === p.id),
  );

  return {
    unique_voters: uniqueVoters,
    eligible_voters: eligible,
    turnout_percentage:
      eligible > 0 ? Math.round((uniqueVoters / eligible) * 1000) / 10 : 0,
    positions_count: positions.length,
    contestable_positions: contestable.length,
    total_contestants: candidates.length,
  };
}

export async function castVote(
  electionId: string,
  userId: string,
  selections: VoteSelection[],
) {
  await assertUserCanVote(userId);

  const election = await getElectionRow(electionId);
  await assertElectionDepartmentAccess(userId, election.scope, election.department_id);

  if (election.status !== 'active') {
    throw new ValidationError('This election is not currently active');
  }

  const positions = await fetchPositions(electionId);
  const candidates = await fetchCandidates(electionId);
  const candidateMap = new Map(candidates.map((c) => [c.id, c]));
  const positionMap = new Map(positions.map((p) => [p.id, p]));

  if (selections.length !== new Set(selections.map((s) => s.position_id)).size) {
    throw new ValidationError('Duplicate position selections are not allowed');
  }

  const contestablePositionIds = positions
    .filter((p) => candidates.some((c) => c.position_id === p.id))
    .map((p) => p.id);

  if (contestablePositionIds.length === 0) {
    throw new ValidationError('This election has no contestants yet');
  }

  const requireAll = election.require_all_positions ?? true;
  if (requireAll && selections.length !== contestablePositionIds.length) {
    throw new ValidationError(
      `Respond to every position — pick a candidate or abstain (${contestablePositionIds.length} required)`,
    );
  }
  if (!requireAll && selections.length === 0) {
    throw new ValidationError('Select at least one position');
  }

  const candidateInserts: Array<{
    election_id: string;
    user_id: string;
    candidate_id: string;
    position_id: string;
  }> = [];
  const abstainInserts: Array<{
    election_id: string;
    user_id: string;
    position_id: string;
  }> = [];

  for (const sel of selections) {
    if (!positionMap.has(sel.position_id)) {
      throw new ValidationError('Invalid position for this election');
    }
    if (!contestablePositionIds.includes(sel.position_id)) {
      throw new ValidationError('One or more positions have no contestants');
    }
    if (sel.choice === 'abstain') {
      abstainInserts.push({
        election_id: electionId,
        user_id: userId,
        position_id: sel.position_id,
      });
      continue;
    }
    const cand = candidateMap.get(sel.candidate_id);
    if (!cand || cand.election_id !== electionId || cand.position_id !== sel.position_id) {
      throw new ValidationError('One or more invalid contestants for this election');
    }
    candidateInserts.push({
      election_id: electionId,
      user_id: userId,
      candidate_id: sel.candidate_id,
      position_id: sel.position_id,
    });
  }

  const { error: ballotError } = await getSupabase()
    .from('election_ballots')
    .insert({ election_id: electionId, user_id: userId });

  if (ballotError) {
    if (ballotError.code === '23505') {
      throw new ValidationError('You have already voted in this election');
    }
    if (ballotError.code === '42P01') {
      throw new ValidationError(
        'Election ballot schema is incomplete. Run MANUAL_SETUP §2.22.2 in Supabase.',
        'ELECTION_SCHEMA_INCOMPLETE',
      );
    }
    throw ballotError;
  }

  if (candidateInserts.length > 0) {
    const { error: voteError } = await getSupabase().from('election_votes').insert(candidateInserts);
    if (voteError) {
      await rollbackBallot(electionId, userId);
      if (voteError.code === '23505') {
        throw new ValidationError('You have already voted in this election');
      }
      throw voteError;
    }
  }

  if (abstainInserts.length > 0) {
    const { error: abstainError } = await getSupabase()
      .from('election_position_abstentions')
      .insert(abstainInserts);
    if (abstainError) {
      await rollbackBallot(electionId, userId);
      await getSupabase()
        .from('election_votes')
        .delete()
        .eq('election_id', electionId)
        .eq('user_id', userId);
      if (abstainError.code === '23505') {
        throw new ValidationError('You have already voted in this election');
      }
      throw abstainError;
    }
  }

  return getElectionDetail(electionId, userId);
}

const MIN_ELECTION_LEAD_MS = 24 * 60 * 60 * 1000;

function assertElectionStartLeadTime(startDate: string) {
  const start = new Date(startDate).getTime();
  if (start < Date.now() + MIN_ELECTION_LEAD_MS) {
    throw new ValidationError('Election must start at least 24 hours from now');
  }
}

export async function createElection(
  createdBy: string,
  input: {
    title: string;
    description?: string;
    kind?: 'executive' | 'custom';
    scope?: 'chapter' | 'department';
    department_id?: string;
    require_all_positions?: boolean;
    start_date: string;
    end_date: string;
  },
) {
  if (new Date(input.start_date) >= new Date(input.end_date)) {
    throw new ValidationError('End date must be after start date');
  }
  assertElectionStartLeadTime(input.start_date);
  if (input.scope === 'department' && !input.department_id) {
    throw new ValidationError('Department elections require a department');
  }

  const { data, error } = await getSupabase()
    .from('elections')
    .insert({
      title: input.title.trim(),
      description: input.description ?? null,
      kind: input.kind ?? 'executive',
      scope: input.scope ?? 'chapter',
      department_id: input.department_id ?? null,
      require_all_positions: input.require_all_positions ?? true,
      start_date: input.start_date,
      end_date: input.end_date,
      created_by: createdBy,
    })
    .select()
    .single();

  if (error) throw error;
  return { ...data, status: computeStatus(data.start_date, data.end_date) };
}

export async function updateElection(
  electionId: string,
  updates: {
    title?: string;
    description?: string;
    start_date?: string;
    end_date?: string;
    require_all_positions?: boolean;
  },
) {
  const election = await getElectionRow(electionId);
  if (updates.require_all_positions !== undefined && election.status !== 'upcoming') {
    throw new ValidationError('Ballot rules can only be changed before the election goes live');
  }
  if (updates.start_date !== undefined && election.status !== 'upcoming') {
    throw new ValidationError('Start time can only be changed before voting opens');
  }
  if (updates.end_date !== undefined && election.status === 'completed') {
    throw new ValidationError('End time cannot be changed after the election closes');
  }

  const nextStart = updates.start_date ?? election.start_date;
  const nextEnd = updates.end_date ?? election.end_date;
  if (new Date(nextStart) >= new Date(nextEnd)) {
    throw new ValidationError('End date must be after start date');
  }
  if (updates.start_date !== undefined) {
    const existingStartMs = new Date(election.start_date).getTime();
    const nextStartMs = new Date(nextStart).getTime();
    const startChanged = Math.abs(existingStartMs - nextStartMs) > 60_000;
    if (startChanged) {
      assertElectionStartLeadTime(nextStart);
    }
  }
  if (updates.end_date !== undefined && election.status === 'active') {
    if (new Date(nextEnd).getTime() <= Date.now()) {
      throw new ValidationError('End time must be in the future while voting is open');
    }
  }

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.start_date !== undefined) payload.start_date = updates.start_date;
  if (updates.end_date !== undefined) payload.end_date = updates.end_date;
  if (updates.require_all_positions !== undefined) {
    payload.require_all_positions = updates.require_all_positions;
  }

  const { data, error } = await getSupabase()
    .from('elections')
    .update(payload)
    .eq('id', electionId)
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new NotFoundError('Election not found');
  return { ...data, status: computeStatus(data.start_date, data.end_date) };
}

export async function deleteElection(electionId: string) {
  const election = await getElectionRow(electionId);
  if (election.status !== 'upcoming') {
    throw new ValidationError('Only upcoming elections can be deleted');
  }
  const { error } = await getSupabase().from('elections').delete().eq('id', electionId);
  if (error) throw error;
}

export async function listAllElectionsAdmin(statusFilter?: ElectionStatus) {
  const { data, error } = await getSupabase()
    .from('elections_with_status')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!statusFilter) return data ?? [];
  return (data ?? []).filter((e) => e.status === statusFilter);
}

export async function getAdminElectionSetup(electionId: string) {
  const election = await getElectionRow(electionId);
  const positions = await fetchPositions(electionId);
  const candidates = await fetchCandidates(electionId);

  const positionsWithCandidates = positions.map((pos) => ({
    id: pos.id,
    title: pos.title,
    sort_order: pos.sort_order,
    candidates: candidates
      .filter((c) => c.position_id === pos.id)
      .map((c) => ({
        id: c.id,
        name: c.name,
        manifesto: c.manifesto,
        image_url: publicCandidateImage(c.image_url),
      })),
  }));

  return {
    election: {
      id: election.id,
      title: election.title,
      description: election.description,
      status: election.status,
      start_date: election.start_date,
      end_date: election.end_date,
      require_all_positions: election.require_all_positions ?? true,
    },
    positions: positionsWithCandidates,
    can_edit_structure: election.status === 'upcoming',
  };
}

export async function createPosition(
  electionId: string,
  input: { title: string; sort_order?: number },
) {
  const election = await getElectionRow(electionId);
  assertStructureEditable(election.status);

  const title = input.title.trim();
  const { data, error } = await getSupabase()
    .from('election_positions')
    .insert({
      election_id: electionId,
      title,
      sort_order: input.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new ValidationError('A position with this title already exists');
    }
    throw error;
  }
  return data;
}

export async function updatePosition(
  positionId: string,
  updates: { title?: string; sort_order?: number },
) {
  const { data: pos } = await getSupabase()
    .from('election_positions')
    .select('id, election_id')
    .eq('id', positionId)
    .maybeSingle();

  if (!pos) throw new NotFoundError('Position not found');
  const election = await getElectionRow(pos.election_id);
  assertStructureEditable(election.status);

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.title !== undefined) payload.title = updates.title.trim();
  if (updates.sort_order !== undefined) payload.sort_order = updates.sort_order;

  const { data, error } = await getSupabase()
    .from('election_positions')
    .update(payload)
    .eq('id', positionId)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new ValidationError('A position with this title already exists');
    }
    throw error;
  }

  if (updates.title !== undefined) {
    await getSupabase()
      .from('election_candidates')
      .update({ position: updates.title.trim(), updated_at: new Date().toISOString() })
      .eq('position_id', positionId);
  }

  return data;
}

export async function deletePosition(positionId: string) {
  const { data: pos } = await getSupabase()
    .from('election_positions')
    .select('election_id')
    .eq('id', positionId)
    .maybeSingle();

  if (!pos) throw new NotFoundError('Position not found');
  const election = await getElectionRow(pos.election_id);
  assertStructureEditable(election.status);

  const { error } = await getSupabase().from('election_positions').delete().eq('id', positionId);
  if (error) throw error;
}

export async function createCandidate(
  electionId: string,
  input: {
    position_id: string;
    name: string;
    manifesto?: string;
  },
  imageFile?: Express.Multer.File,
) {
  const election = await getElectionRow(electionId);
  if (election.status === 'completed') {
    throw new ValidationError('Cannot add contestants to a completed election');
  }
  assertStructureEditable(election.status);

  const { data: position } = await getSupabase()
    .from('election_positions')
    .select('id, title, election_id')
    .eq('id', input.position_id)
    .eq('election_id', electionId)
    .maybeSingle();

  if (!position) throw new ValidationError('Invalid position for this election');

  const { data, error } = await getSupabase()
    .from('election_candidates')
    .insert({
      election_id: electionId,
      position_id: input.position_id,
      name: input.name.trim(),
      position: position.title,
      manifesto: input.manifesto ?? null,
      image_url: null,
    })
    .select()
    .single();

  if (error) throw error;

  if (imageFile) {
    const imageUrl = await uploadCandidateImage(electionId, data.id, imageFile);
    const { data: updated, error: updateErr } = await getSupabase()
      .from('election_candidates')
      .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
      .eq('id', data.id)
      .select()
      .single();
    if (updateErr) throw updateErr;
    return { ...updated, image_url: publicCandidateImage(updated.image_url) };
  }

  return { ...data, image_url: publicCandidateImage(data.image_url) };
}

export async function updateCandidate(
  candidateId: string,
  updates: {
    name?: string;
    manifesto?: string;
    remove_photo?: boolean;
  },
  imageFile?: Express.Multer.File,
) {
  const { data: existing } = await getSupabase()
    .from('election_candidates')
    .select('election_id, image_url')
    .eq('id', candidateId)
    .maybeSingle();

  if (!existing) throw new NotFoundError('Contestant not found');
  const election = await getElectionRow(existing.election_id);
  assertStructureEditable(election.status);

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) payload.name = updates.name.trim();
  if (updates.manifesto !== undefined) payload.manifesto = updates.manifesto;

  if (updates.remove_photo) {
    await deleteCandidateImage(existing.image_url);
    payload.image_url = null;
  }

  if (imageFile) {
    if (existing.image_url) await deleteCandidateImage(existing.image_url);
    payload.image_url = await uploadCandidateImage(existing.election_id, candidateId, imageFile);
  }

  const { data, error } = await getSupabase()
    .from('election_candidates')
    .update(payload)
    .eq('id', candidateId)
    .select()
    .single();

  if (error) throw error;
  return { ...data, image_url: publicCandidateImage(data.image_url) };
}

export async function deleteCandidate(candidateId: string) {
  const { data: existing } = await getSupabase()
    .from('election_candidates')
    .select('election_id, image_url')
    .eq('id', candidateId)
    .maybeSingle();

  if (!existing) throw new NotFoundError('Contestant not found');
  const election = await getElectionRow(existing.election_id);
  assertStructureEditable(election.status);

  await deleteCandidateImage(existing.image_url);
  const { error } = await getSupabase().from('election_candidates').delete().eq('id', candidateId);
  if (error) throw error;
}

const LEVEL_KEYS = MEMBER_LEVEL_BUCKETS;

export async function buildExtendedAnalytics(
  electionId: string,
  positionResults: ReturnType<typeof buildPositionResults>,
  totalVoters: number,
) {
  const { data: deptRows } = await getSupabase().from('departments').select('id, name');
  const deptNames = new Map((deptRows ?? []).map((d) => [d.id as string, d.name as string]));

  const { data: eligibleRows } = await getSupabase()
    .from('users')
    .select('level, department_id')
    .eq('is_active', true)
    .eq('is_email_verified', true)
    .in('role', [...ELECTION_VOTER_ROLES]);

  const eligibleByLevel = new Map<string, number>();
  const eligibleByDept = new Map<string, number>();
  for (const row of eligibleRows ?? []) {
    const lv = (row.level as string) ?? 'unknown';
    eligibleByLevel.set(lv, (eligibleByLevel.get(lv) ?? 0) + 1);
    const deptKey = (row.department_id as string | null) ?? 'unassigned';
    eligibleByDept.set(deptKey, (eligibleByDept.get(deptKey) ?? 0) + 1);
  }

  const { data: voterRows } = await getSupabase()
    .from('election_votes')
    .select('user_id')
    .eq('election_id', electionId);
  const voterIds = [...new Set((voterRows ?? []).map((r) => r.user_id))];

  const votersByLevel = new Map<string, number>();
  const votersByDept = new Map<string, number>();
  if (voterIds.length > 0) {
    const { data: users } = await getSupabase()
      .from('users')
      .select('id, level, department_id')
      .in('id', voterIds);
    for (const u of users ?? []) {
      const lv = (u.level as string) ?? 'unknown';
      votersByLevel.set(lv, (votersByLevel.get(lv) ?? 0) + 1);
      const deptKey = (u.department_id as string | null) ?? 'unassigned';
      votersByDept.set(deptKey, (votersByDept.get(deptKey) ?? 0) + 1);
    }
  }

  const levelTurnout = LEVEL_KEYS.map((level) => {
    const eligible = eligibleByLevel.get(level) ?? 0;
    const voted = votersByLevel.get(level) ?? 0;
    return {
      level,
      eligible,
      voted,
      turnout_percentage: eligible > 0 ? Math.round((voted / eligible) * 1000) / 10 : 0,
      share_of_voters:
        totalVoters > 0 ? Math.round((voted / totalVoters) * 1000) / 10 : 0,
    };
  }).filter((l) => l.eligible > 0);

  const departmentTurnout = [...eligibleByDept.entries()]
    .map(([deptId, eligible]) => {
      const voted = votersByDept.get(deptId) ?? 0;
      const name =
        deptId === 'unassigned' ? 'Unassigned department' : (deptNames.get(deptId) ?? 'Department');
      return {
        department_id: deptId === 'unassigned' ? null : deptId,
        department_name: name,
        eligible,
        voted,
        turnout_percentage: eligible > 0 ? Math.round((voted / eligible) * 1000) / 10 : 0,
      };
    })
    .filter((d) => d.eligible > 0)
    .sort((a, b) => b.turnout_percentage - a.turnout_percentage);

  const byTurnout = [...levelTurnout].sort((a, b) => b.turnout_percentage - a.turnout_percentage);
  const mostActive = byTurnout[0] ?? null;
  const leastActive = byTurnout[byTurnout.length - 1] ?? null;
  const turnoutSpread =
    mostActive && leastActive
      ? Math.round((mostActive.turnout_percentage - leastActive.turnout_percentage) * 10) / 10
      : 0;

  const winnerShares: number[] = [];
  const margins: number[] = [];

  for (const pos of positionResults) {
    if (pos.quorum_not_met || !pos.winner) continue;
    const winnerCandidate = pos.candidates.find((c) => c.is_winner);
    if (!winnerCandidate) continue;
    const topPct = winnerCandidate.vote_percentage ?? 0;
    winnerShares.push(topPct);
    const sorted = [...pos.candidates].sort(
      (a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0),
    );
    const second = sorted[1];
    if (second) {
      margins.push(topPct - (second.vote_percentage ?? 0));
    }
  }

  const strongestWins = collectStrongestWins(positionResults);
  const strongestCandidate = strongestWins[0] ?? null;

  const average_winner_share =
    winnerShares.length > 0
      ? Math.round((winnerShares.reduce((a, b) => a + b, 0) / winnerShares.length) * 10) / 10
      : 0;
  const average_winning_margin =
    margins.length > 0
      ? Math.round((margins.reduce((a, b) => a + b, 0) / margins.length) * 10) / 10
      : 0;

  return {
    level_turnout: levelTurnout,
    department_turnout: departmentTurnout,
    most_active_level: mostActive,
    least_active_level: leastActive,
    turnout_spread: turnoutSpread,
    average_winner_share,
    average_winning_margin,
    strongest_wins: strongestWins,
    strongest_candidate: strongestCandidate,
    published_at: new Date().toISOString(),
  };
}

export async function getAdminStats() {
  const { count: totalUsers } = await getSupabase()
    .from('users')
    .select('*', { count: 'exact', head: true })
    .in('role', [...ELECTION_VOTER_ROLES]);

  const { data: elections } = await getSupabase()
    .from('elections_with_status')
    .select('id, title, status, vote_count');

  const electionsByStatus = (elections ?? []).reduce<Record<string, number>>((acc, e) => {
    acc[e.status] = (acc[e.status] ?? 0) + 1;
    return acc;
  }, {});

  const totalVotesCount = (elections ?? []).reduce(
    (s, e) => s + Number(e.vote_count ?? 0),
    0,
  );

  const votesByElection = [...(elections ?? [])]
    .sort((a, b) => Number(b.vote_count ?? 0) - Number(a.vote_count ?? 0))
    .slice(0, 10)
    .map((e) => ({ id: e.id, title: e.title, votes: Number(e.vote_count ?? 0) }));

  const { data: recentBallots, error: ballotError } = await getSupabase()
    .from('election_ballots')
    .select('cast_at, user_id, election_id')
    .order('cast_at', { ascending: false })
    .limit(10);

  let recentBallotRows: Array<{
    voted_at: string;
    user_id: string;
    election_id: string;
  }> = [];

  if (!ballotError && recentBallots) {
    recentBallotRows = recentBallots.map((b) => ({
      voted_at: b.cast_at as string,
      user_id: b.user_id as string,
      election_id: b.election_id as string,
    }));
  } else if (ballotError?.code === '42P01') {
    const { data: recentVotes } = await getSupabase()
      .from('election_votes')
      .select('voted_at, user_id, election_id')
      .order('voted_at', { ascending: false })
      .limit(50);
    const seen = new Set<string>();
    for (const v of recentVotes ?? []) {
      const key = `${v.user_id}:${v.election_id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      recentBallotRows.push({
        voted_at: v.voted_at as string,
        user_id: v.user_id as string,
        election_id: v.election_id as string,
      });
      if (recentBallotRows.length >= 10) break;
    }
  } else if (ballotError) {
    throw ballotError;
  }

  const recentVoters: Array<{
    full_name: string | null;
    student_id: string | null;
    voted_at: string;
    election_title: string | null;
    user_id: string;
    election_id: string;
  }> = [];

  for (const v of recentBallotRows) {
    const { data: voter } = await getSupabase()
      .from('users')
      .select('first_name, last_name, display_name, matric_number')
      .eq('id', v.user_id)
      .single();
    const { data: el } = await getSupabase()
      .from('elections')
      .select('title')
      .eq('id', v.election_id)
      .single();
    recentVoters.push({
      full_name: voter
        ? (voter.display_name ?? `${voter.first_name} ${voter.last_name}`)
        : null,
      student_id: voter?.matric_number ?? null,
      voted_at: v.voted_at,
      election_title: el?.title ?? null,
      user_id: v.user_id,
      election_id: v.election_id,
    });
  }

  return {
    stats: {
      total_users: totalUsers ?? 0,
      total_elections: elections?.length ?? 0,
      active_elections: electionsByStatus.active ?? 0,
      total_votes: totalVotesCount,
    },
    elections_by_status: Object.entries(electionsByStatus).map(([status, count]) => ({
      status,
      count,
    })),
    votes_by_election: votesByElection,
    recent_voters: recentVoters,
  };
}

export async function getElectionResults(
  electionId: string,
  options?: { allowLive?: boolean },
) {
  const election = await getElectionRow(electionId);
  if (election.status === 'active' && !options?.allowLive) {
    throw new ValidationError(
      'Live results are hidden during voting. Confirm to view provisional tallies.',
      'LIVE_RESULTS_BLOCKED',
    );
  }

  const positions = await fetchPositions(electionId);
  const candidates = await fetchCandidates(electionId);

  const { data: voteRows } = await getSupabase()
    .from('election_votes')
    .select('candidate_id, user_id')
    .eq('election_id', electionId);

  const { countByCandidate } = buildVoteCounts(voteRows ?? []);
  const abstentionCounts = await fetchAbstentionCounts(electionId);
  const uniqueVoters = await countBallotsCast(electionId);
  const eligibleVoters = await countEligibleVoters();
  const optimizedCandidates = candidates.map((c) => ({
    ...c,
    image_url: publicCandidateImage(c.image_url),
  }));
  const positionResults = buildPositionResults(
    positions,
    optimizedCandidates,
    countByCandidate,
    abstentionCounts,
    eligibleVoters,
  );
  const analytics = await buildAnalytics(uniqueVoters, positions, candidates);
  const extended = await buildExtendedAnalytics(electionId, positionResults, uniqueVoters);

  return {
    election: {
      id: election.id,
      title: election.title,
      description: election.description,
      status: election.status,
      start_date: election.start_date,
      end_date: election.end_date,
      require_all_positions: election.require_all_positions ?? true,
      live_preview: election.status === 'active' && Boolean(options?.allowLive),
    },
    positions: positionResults,
    analytics: { ...analytics, extended },
  };
}

export async function getPublicElectionResults(electionId: string) {
  const election = await getElectionRow(electionId);
  if (election.status !== 'completed') {
    throw new ValidationError('Results are available after the election closes');
  }
  return getElectionResults(electionId);
}

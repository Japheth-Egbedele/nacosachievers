import { getSupabase } from '../config/supabase.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/errors.js';

type ElectionStatus = 'active' | 'upcoming' | 'completed';

function computeStatus(startDate: string, endDate: string): ElectionStatus {
  const now = Date.now();
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  if (now < start) return 'upcoming';
  if (now >= end) return 'completed';
  return 'active';
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
  let q = getSupabase()
    .from('elections_with_status')
    .select('*')
    .eq('scope', 'chapter')
    .order('created_at', { ascending: false });

  const { data: elections, error } = await q;
  if (error) throw error;

  const { data: userVotes } = await getSupabase()
    .from('election_votes')
    .select('election_id')
    .eq('user_id', userId);

  const votedSet = new Set((userVotes ?? []).map((v) => v.election_id));

  let enriched = (elections ?? []).map((e) => ({
    ...e,
    user_has_voted: votedSet.has(e.id),
  }));

  if (statusFilter) {
    enriched = enriched.filter((e) => e.status === statusFilter);
  }

  return enriched;
}

export async function getElectionDetail(electionId: string, userId: string) {
  const { data: election, error: elErr } = await getSupabase()
    .from('elections_with_status')
    .select('*')
    .eq('id', electionId)
    .maybeSingle();

  if (elErr || !election) throw new NotFoundError('Election not found');

  const { data: candidates, error: candErr } = await getSupabase()
    .from('election_candidates')
    .select('id, name, position, manifesto, image_url, created_at')
    .eq('election_id', electionId)
    .order('created_at', { ascending: true });

  if (candErr) throw candErr;

  const { data: voteRows } = await getSupabase()
    .from('election_votes')
    .select('candidate_id')
    .eq('election_id', electionId);

  const countByCandidate = new Map<string, number>();
  for (const v of voteRows ?? []) {
    countByCandidate.set(v.candidate_id, (countByCandidate.get(v.candidate_id) ?? 0) + 1);
  }

  const candidatesWithCount = (candidates ?? []).map((c) => ({
    ...c,
    vote_count: countByCandidate.get(c.id) ?? 0,
  }));

  const { data: userVoteRows } = await getSupabase()
    .from('election_votes')
    .select('candidate_id')
    .eq('election_id', electionId)
    .eq('user_id', userId);

  const userVotes = userVoteRows?.map((r) => r.candidate_id) ?? [];
  const totalVotes = candidatesWithCount.reduce((s, c) => s + c.vote_count, 0);

  return {
    election,
    candidates: candidatesWithCount,
    user_vote: userVotes.length > 0 ? userVotes : null,
    total_votes: totalVotes,
  };
}

export async function castVote(
  electionId: string,
  userId: string,
  candidateIds: string[],
) {
  await assertUserCanVote(userId);

  const { data: election } = await getSupabase()
    .from('elections_with_status')
    .select('id, status, start_date, end_date')
    .eq('id', electionId)
    .single();

  if (!election) throw new NotFoundError('Election not found');

  const status =
    election.status ?? computeStatus(election.start_date, election.end_date);
  if (status !== 'active') {
    throw new ValidationError('This election is not currently active');
  }

  const { data: validCandidates } = await getSupabase()
    .from('election_candidates')
    .select('id')
    .eq('election_id', electionId)
    .in('id', candidateIds);

  if (!validCandidates || validCandidates.length !== candidateIds.length) {
    throw new ValidationError('One or more invalid candidates for this election');
  }

  const { data: existing } = await getSupabase()
    .from('election_votes')
    .select('id')
    .eq('election_id', electionId)
    .eq('user_id', userId)
    .limit(1);

  if (existing && existing.length > 0) {
    throw new ValidationError('You have already voted in this election');
  }

  const inserts = candidateIds.map((candidateId) => ({
    election_id: electionId,
    user_id: userId,
    candidate_id: candidateId,
  }));

  const { error: voteError } = await getSupabase().from('election_votes').insert(inserts);

  if (voteError) {
    if (voteError.code === '23505') {
      throw new ValidationError('You have already voted in this election');
    }
    throw voteError;
  }

  const detail = await getElectionDetail(electionId, userId);
  return {
    success: true,
    candidate_ids: candidateIds,
    results: detail.candidates,
  };
}

export async function createElection(
  createdBy: string,
  input: {
    title: string;
    description?: string;
    kind?: 'executive' | 'custom';
    scope?: 'chapter' | 'department';
    department_id?: string;
    start_date: string;
    end_date: string;
  },
) {
  if (new Date(input.start_date) >= new Date(input.end_date)) {
    throw new ValidationError('End date must be after start date');
  }

  const { data, error } = await getSupabase()
    .from('elections')
    .insert({
      title: input.title.trim(),
      description: input.description ?? null,
      kind: input.kind ?? 'executive',
      scope: input.scope ?? 'chapter',
      department_id: input.department_id ?? null,
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
  },
) {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.start_date !== undefined) payload.start_date = updates.start_date;
  if (updates.end_date !== undefined) payload.end_date = updates.end_date;

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

export async function createCandidate(
  electionId: string,
  input: {
    name: string;
    position: string;
    manifesto?: string;
    image_url?: string;
  },
) {
  const { data: election } = await getSupabase()
    .from('elections_with_status')
    .select('id, status, start_date, end_date')
    .eq('id', electionId)
    .single();

  if (!election) throw new NotFoundError('Election not found');
  const status =
    election.status ?? computeStatus(election.start_date, election.end_date);
  if (status === 'completed') {
    throw new ValidationError('Cannot add candidates to a completed election');
  }

  const { data, error } = await getSupabase()
    .from('election_candidates')
    .insert({
      election_id: electionId,
      name: input.name.trim(),
      position: input.position.trim(),
      manifesto: input.manifesto ?? null,
      image_url: input.image_url || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCandidate(
  candidateId: string,
  updates: {
    name?: string;
    position?: string;
    manifesto?: string;
    image_url?: string;
  },
) {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.position !== undefined) payload.position = updates.position;
  if (updates.manifesto !== undefined) payload.manifesto = updates.manifesto;
  if (updates.image_url !== undefined) payload.image_url = updates.image_url || null;

  const { data, error } = await getSupabase()
    .from('election_candidates')
    .update(payload)
    .eq('id', candidateId)
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new NotFoundError('Candidate not found');
  return data;
}

export async function deleteCandidate(candidateId: string) {
  const { error } = await getSupabase()
    .from('election_candidates')
    .delete()
    .eq('id', candidateId);
  if (error) throw error;
}

export async function getAdminStats() {
  const { count: totalUsers } = await getSupabase()
    .from('users')
    .select('*', { count: 'exact', head: true })
    .in('role', ['member', 'alumni', 'executive']);

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

  const { data: recentVotes } = await getSupabase()
    .from('election_votes')
    .select('voted_at, user_id, election_id')
    .order('voted_at', { ascending: false })
    .limit(10);

  const recentVoters: Array<{
    full_name: string | null;
    student_id: string | null;
    voted_at: string;
    election_title: string | null;
  }> = [];

  for (const v of recentVotes ?? []) {
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

export async function getElectionResults(electionId: string) {
  const { data: election } = await getSupabase()
    .from('elections_with_status')
    .select('*')
    .eq('id', electionId)
    .single();

  if (!election) throw new NotFoundError('Election not found');

  const { data: candidates } = await getSupabase()
    .from('election_candidates')
    .select('id, name, position, manifesto, image_url')
    .eq('election_id', electionId);

  const { data: voteRows } = await getSupabase()
    .from('election_votes')
    .select('candidate_id, user_id')
    .eq('election_id', electionId);

  const countByCandidate = new Map<string, number>();
  const voterIds = new Set<string>();
  for (const v of voteRows ?? []) {
    countByCandidate.set(v.candidate_id, (countByCandidate.get(v.candidate_id) ?? 0) + 1);
    voterIds.add(v.user_id);
  }

  const ranked = (candidates ?? [])
    .map((c) => ({
      ...c,
      vote_count: countByCandidate.get(c.id) ?? 0,
    }))
    .sort((a, b) => b.vote_count - a.vote_count);

  const totalVotes = ranked.reduce((s, c) => s + c.vote_count, 0);

  return {
    election,
    candidates: ranked,
    total_votes: totalVotes,
    unique_voters: voterIds.size,
  };
}

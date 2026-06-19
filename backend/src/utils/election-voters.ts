/** Roles that may cast ballots in chapter elections (verified, active students + executives). */
export const ELECTION_VOTER_ROLES = ['member', 'executive'] as const;

export function isElectionVoterRole(role: string): boolean {
  return role === 'member' || role === 'executive';
}

/** Minimum votes a sole contestant needs: one-third of eligible voters (rounded up). */
export function soleContestantQuorumMin(eligibleVoters: number): number {
  if (eligibleVoters <= 0) return 0;
  return Math.ceil(eligibleVoters / 3);
}

export function soleContestantQuorumMet(voteCount: number, eligibleVoters: number): boolean {
  if (eligibleVoters <= 0) return voteCount > 0;
  return voteCount >= soleContestantQuorumMin(eligibleVoters);
}

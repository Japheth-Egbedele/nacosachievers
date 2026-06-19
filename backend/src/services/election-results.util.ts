import {
  soleContestantQuorumMet,
  soleContestantQuorumMin,
} from '../utils/election-voters.js';

export interface ResultPositionRow {
  id: string;
  title: string;
  sort_order: number;
}

export interface ResultCandidateRow {
  id: string;
  position_id: string;
  name: string;
  manifesto: string | null;
  image_url: string | null;
}

export function buildPositionResults(
  positions: ResultPositionRow[],
  candidates: ResultCandidateRow[],
  countByCandidate: Map<string, number>,
  abstentionCountByPosition: Map<string, number> = new Map(),
  eligibleVoters = 0,
) {
  return positions.map((pos) => {
    const posCandidates = candidates
      .filter((c) => c.position_id === pos.id)
      .map((c) => ({
        ...c,
        vote_count: countByCandidate.get(c.id) ?? 0,
      }))
      .sort((a, b) => b.vote_count - a.vote_count || a.name.localeCompare(b.name));

    const totalVotes = posCandidates.reduce((s, c) => s + c.vote_count, 0);
    const abstentionCount = abstentionCountByPosition.get(pos.id) ?? 0;
    const ballotsCast = totalVotes + abstentionCount;
    const maxVotes = posCandidates.length > 0 ? posCandidates[0]!.vote_count : 0;
    const winners = posCandidates.filter((c) => c.vote_count === maxVotes && maxVotes > 0);
    const isTie = winners.length > 1;
    const uncontested = posCandidates.length === 1;
    const minVotesRequired =
      uncontested && eligibleVoters > 0 ? soleContestantQuorumMin(eligibleVoters) : undefined;
    const quorumNotMet =
      uncontested &&
      posCandidates.length > 0 &&
      !soleContestantQuorumMet(posCandidates[0]!.vote_count, eligibleVoters);

    const ranked = posCandidates.map((c) => {
      const vote_percentage =
        ballotsCast > 0 ? Math.round((c.vote_count / ballotsCast) * 1000) / 10 : 0;
      const wouldWin = !isTie && c.id === winners[0]?.id && maxVotes > 0;
      const isWinner = wouldWin && !quorumNotMet;
      return {
        id: c.id,
        name: c.name,
        manifesto: c.manifesto,
        image_url: c.image_url,
        vote_count: c.vote_count,
        vote_percentage,
        is_winner: isWinner,
        is_tie: isTie && c.vote_count === maxVotes && maxVotes > 0,
        quorum_not_met: uncontested && quorumNotMet && c.id === posCandidates[0]!.id,
      };
    });

    let winner = !isTie && winners[0] && !quorumNotMet ? winners[0] : null;

    return {
      id: pos.id,
      title: pos.title,
      sort_order: pos.sort_order,
      total_votes: totalVotes,
      ballots_cast: ballotsCast,
      abstention_count: abstentionCount,
      abstention_percentage:
        ballotsCast > 0 ? Math.round((abstentionCount / ballotsCast) * 1000) / 10 : 0,
      contestant_count: posCandidates.length,
      winner: winner
        ? { id: winner.id, name: winner.name, vote_count: winner.vote_count }
        : null,
      is_tie: isTie && maxVotes > 0,
      quorum_not_met: quorumNotMet,
      min_votes_required: minVotesRequired,
      eligible_voters: eligibleVoters > 0 ? eligibleVoters : undefined,
      candidates: ranked,
    };
  });
}

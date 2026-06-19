import { describe, expect, it, vi } from 'vitest';
import { buildPositionResults, collectStrongestWins } from '../services/election-results.util.js';
import { soleContestantQuorumMin, soleContestantQuorumMet } from '../utils/election-voters.js';
import { requireHubAccount } from '../middleware/require-hub-account.js';
import { ForbiddenError } from '../utils/errors.js';

describe('election-voters quorum', () => {
  it('requires ceil(eligible/3) votes for sole contestant', () => {
    expect(soleContestantQuorumMin(90)).toBe(30);
    expect(soleContestantQuorumMin(100)).toBe(34);
    expect(soleContestantQuorumMet(30, 90)).toBe(true);
    expect(soleContestantQuorumMet(29, 90)).toBe(false);
  });
});

describe('buildPositionResults', () => {
  it('includes abstention counts in ballots_cast and percentages', () => {
    const positions = [{ id: 'pos-1', title: 'President', sort_order: 0 }];
    const candidates = [
      {
        id: 'cand-1',
        position_id: 'pos-1',
        name: 'Ada',
        manifesto: null,
        image_url: null,
      },
      {
        id: 'cand-2',
        position_id: 'pos-1',
        name: 'Ben',
        manifesto: null,
        image_url: null,
      },
    ];
    const counts = new Map([
      ['cand-1', 3],
      ['cand-2', 1],
    ]);
    const abstentions = new Map([['pos-1', 2]]);

    const results = buildPositionResults(positions, candidates, counts, abstentions, 100);
    expect(results).toHaveLength(1);
    expect(results[0]!.total_votes).toBe(4);
    expect(results[0]!.abstention_count).toBe(2);
    expect(results[0]!.ballots_cast).toBe(6);
    expect(results[0]!.candidates[0]!.vote_percentage).toBe(50);
  });

  it('denies winner for sole contestant below one-third quorum', () => {
    const positions = [{ id: 'pos-1', title: 'President', sort_order: 0 }];
    const candidates = [
      {
        id: 'cand-1',
        position_id: 'pos-1',
        name: 'Solo',
        manifesto: null,
        image_url: null,
      },
    ];
    const counts = new Map([['cand-1', 10]]);
    const results = buildPositionResults(positions, candidates, counts, new Map(), 90);
    expect(results[0]!.quorum_not_met).toBe(true);
    expect(results[0]!.winner).toBeNull();
    expect(results[0]!.min_votes_required).toBe(30);
    expect(results[0]!.candidates[0]!.is_winner).toBe(false);
  });

  it('elects sole contestant when quorum is met', () => {
    const positions = [{ id: 'pos-1', title: 'President', sort_order: 0 }];
    const candidates = [
      {
        id: 'cand-1',
        position_id: 'pos-1',
        name: 'Solo',
        manifesto: null,
        image_url: null,
      },
    ];
    const counts = new Map([['cand-1', 30]]);
    const results = buildPositionResults(positions, candidates, counts, new Map(), 90);
    expect(results[0]!.quorum_not_met).toBe(false);
    expect(results[0]!.winner?.name).toBe('Solo');
    expect(results[0]!.candidates[0]!.is_winner).toBe(true);
  });
});

describe('collectStrongestWins', () => {
  it('lists all winners tied at the peak vote share', () => {
    const results = [
      {
        title: 'President',
        winner: { name: 'Ada' },
        candidates: [{ is_winner: true, name: 'Ada', vote_percentage: 100 }],
      },
      {
        title: 'Treasurer',
        winner: { name: 'Ben' },
        candidates: [{ is_winner: true, name: 'Ben', vote_percentage: 100 }],
      },
      {
        title: 'Secretary',
        winner: { name: 'Chidi' },
        candidates: [{ is_winner: true, name: 'Chidi', vote_percentage: 80 }],
      },
    ];
    const wins = collectStrongestWins(results);
    expect(wins).toHaveLength(2);
    expect(wins.map((w) => w.name).sort()).toEqual(['Ada', 'Ben']);
    expect(wins.every((w) => w.percentage === 100)).toBe(true);
  });
});

describe('requireHubAccount', () => {
  it('allows staff role', () => {
    const next = vi.fn();
    requireHubAccount(
      { user: { id: 'u1', role: 'staff' } } as never,
      {} as never,
      next,
    );
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects guest role', () => {
    const next = vi.fn();
    requireHubAccount(
      { user: { id: 'u1', role: 'guest' } } as never,
      {} as never,
      next,
    );
    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });
});

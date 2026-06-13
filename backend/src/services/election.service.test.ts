import { describe, expect, it } from 'vitest';
import { buildPositionResults } from '../services/election-results.util.js';

describe('buildPositionResults', () => {
  it('includes abstention counts in ballots_cast and percentages', () => {
    const positions = [
      { id: 'pos-1', title: 'President', sort_order: 0 },
    ];
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

    const results = buildPositionResults(positions, candidates, counts, abstentions);
    expect(results).toHaveLength(1);
    expect(results[0]!.total_votes).toBe(4);
    expect(results[0]!.abstention_count).toBe(2);
    expect(results[0]!.ballots_cast).toBe(6);
    expect(results[0]!.candidates[0]!.vote_percentage).toBe(50);
  });
});

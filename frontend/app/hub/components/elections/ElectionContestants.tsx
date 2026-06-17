'use client';

import CandidatePhoto from '@/app/hub/components/elections/CandidatePhoto';
import { hubBtnPrimary } from '@/lib/hub-styles';
import type { ElectionPosition } from '@/lib/election-types';

type PositionPick = { kind: 'candidate'; id: string } | { kind: 'abstain' };

type ElectionContestantsProps = {
  positions: ElectionPosition[];
  mode: 'vote' | 'preview';
  selected?: Record<string, PositionPick>;
  onPickCandidate?: (positionId: string, candidateId: string) => void;
  onPickAbstain?: (positionId: string) => void;
  canSubmit?: boolean;
  busy?: boolean;
  onReviewSubmit?: () => void;
};

export default function ElectionContestants({
  positions,
  mode,
  selected = {},
  onPickCandidate,
  onPickAbstain,
  canSubmit = false,
  busy = false,
  onReviewSubmit,
}: ElectionContestantsProps) {
  const contestable = positions.filter((p) => p.candidates.length > 0);

  if (!contestable.length) {
    return <p className="text-sm text-zinc-500">No contestants listed yet.</p>;
  }

  return (
    <div className="space-y-8">
      {contestable.map((pos) => (
        <section key={pos.id}>
          <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">{pos.title}</h2>
          <ul className="mt-3 space-y-2">
            {pos.candidates.map((c) =>
              mode === 'vote' ? (
                <li key={c.id}>
                  <label className="flex cursor-pointer items-start gap-4 rounded-xl border border-zinc-200 p-4 transition has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50 dark:border-zinc-700 dark:has-[:checked]:bg-emerald-950/30">
                    <input
                      type="radio"
                      name={`position-${pos.id}`}
                      checked={
                        selected[pos.id]?.kind === 'candidate' && selected[pos.id]?.id === c.id
                      }
                      onChange={() => onPickCandidate?.(pos.id, c.id)}
                      className="mt-5 shrink-0"
                    />
                    <CandidatePhoto
                      name={c.name}
                      imageUrl={c.image_url}
                      size="md"
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="font-medium">{c.name}</span>
                      {c.manifesto && (
                        <p className="mt-1 text-sm text-zinc-500">{c.manifesto}</p>
                      )}
                    </div>
                  </label>
                </li>
              ) : (
                <li
                  key={c.id}
                  className="flex items-start gap-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900/50"
                >
                  <CandidatePhoto name={c.name} imageUrl={c.image_url} size="md" />
                  <div className="min-w-0 flex-1">
                    <span className="font-medium">{c.name}</span>
                    {c.manifesto && (
                      <p className="mt-1 text-sm text-zinc-500">{c.manifesto}</p>
                    )}
                  </div>
                </li>
              ),
            )}
            {mode === 'vote' && (
              <li>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-dashed border-zinc-300 p-4 transition has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50 dark:border-zinc-600 dark:has-[:checked]:bg-amber-950/20">
                  <input
                    type="radio"
                    name={`position-${pos.id}`}
                    checked={selected[pos.id]?.kind === 'abstain'}
                    onChange={() => onPickAbstain?.(pos.id)}
                    className="mt-1"
                  />
                  <div>
                    <span className="font-medium">None of the above</span>
                    <p className="mt-1 text-sm text-zinc-500">
                      Abstain from this position — your ballot still counts.
                    </p>
                  </div>
                </label>
              </li>
            )}
          </ul>
        </section>
      ))}

      {mode === 'vote' && (
        <button
          type="button"
          disabled={!canSubmit || busy}
          onClick={onReviewSubmit}
          className={`${hubBtnPrimary} w-auto px-8`}
        >
          Review & submit ballot
        </button>
      )}
    </div>
  );
}

'use client';

import type { ElectionAnalytics, ElectionPosition } from '@/lib/election-types';

export default function ElectionResultsPanel({
  positions,
  analytics,
  title = 'Results',
  showAnalytics = true,
}: {
  positions: ElectionPosition[];
  analytics?: ElectionAnalytics;
  title?: string;
  showAnalytics?: boolean;
}) {
  return (
    <div className="space-y-8">
      {showAnalytics && analytics && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Ballots cast" value={String(analytics.unique_voters)} />
          <StatCard
            label="Turnout"
            value={`${analytics.turnout_percentage}%`}
            hint={`of ${analytics.eligible_voters} eligible voters`}
          />
          <StatCard label="Positions" value={String(analytics.contestable_positions)} />
          <StatCard label="Contestants" value={String(analytics.total_contestants)} />
        </div>
      )}

      <div>
        <h2 className="text-lg font-bold text-zinc-900 dark:text-white">{title}</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Winners and vote share are calculated <strong>per position</strong>, not across the whole
          election.
        </p>
      </div>

      <div className="space-y-6">
        {positions.map((pos) => (
          <PositionResultCard key={pos.id} position={pos} />
        ))}
        {positions.length === 0 && (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-zinc-500">
            No positions configured yet.
          </p>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-400">{value}</p>
      {hint && <p className="mt-1 text-xs text-zinc-400">{hint}</p>}
    </div>
  );
}

function PositionResultCard({ position }: { position: ElectionPosition }) {
  const maxVotes = Math.max(...position.candidates.map((c) => c.vote_count ?? 0), 0);

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-100 bg-zinc-50 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-950/50">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{position.title}</h3>
          <span className="text-sm text-zinc-500">
            {position.total_votes ?? 0} vote{(position.total_votes ?? 0) === 1 ? '' : 's'} in this
            race
          </span>
        </div>
        {position.winner && !position.is_tie && (
          <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-400">
            Winner: <strong>{position.winner.name}</strong> ({position.winner.vote_count} votes)
          </p>
        )}
        {position.is_tie && (
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
            Tie — multiple contestants share the lead
          </p>
        )}
        {!position.winner && (position.total_votes ?? 0) === 0 && (
          <p className="mt-2 text-sm text-zinc-500">No votes recorded for this position</p>
        )}
      </div>
      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {position.candidates.map((c) => {
          const votes = c.vote_count ?? 0;
          const pct = c.vote_percentage ?? 0;
          const width = maxVotes > 0 ? (votes / maxVotes) * 100 : 0;
          return (
            <li key={c.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="font-medium text-zinc-900 dark:text-white">
                    {c.name}
                    {c.is_winner && (
                      <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                        Winner
                      </span>
                    )}
                    {c.is_tie && (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                        Tied
                      </span>
                    )}
                  </span>
                  {c.manifesto && (
                    <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{c.manifesto}</p>
                  )}
                </div>
                <div className="text-right text-sm font-semibold tabular-nums">
                  {votes} <span className="font-normal text-zinc-500">({pct}%)</span>
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className={`h-full rounded-full transition-all ${
                    c.is_winner ? 'bg-emerald-500' : 'bg-emerald-300 dark:bg-emerald-700'
                  }`}
                  style={{ width: `${width}%` }}
                />
              </div>
            </li>
          );
        })}
        {position.candidates.length === 0 && (
          <li className="px-5 py-6 text-center text-sm text-zinc-500">No contestants</li>
        )}
      </ul>
    </section>
  );
}

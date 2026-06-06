'use client';

import { useState } from 'react';
import { Share2 } from 'lucide-react';
import type { ElectionAnalytics, ElectionPosition } from '@/lib/election-types';
import { hubBtnSecondary } from '@/lib/hub-styles';

type ElectionResultsReportProps = {
  electionTitle?: string;
  electionId?: string;
  positions: ElectionPosition[];
  analytics?: ElectionAnalytics;
  shareUrl?: string;
};

export default function ElectionResultsReport({
  electionTitle,
  electionId,
  positions,
  analytics,
  shareUrl,
}: ElectionResultsReportProps) {
  const [shareMsg, setShareMsg] = useState('');
  const extended = analytics?.extended;

  const resolvedShareUrl =
    shareUrl ??
    (typeof window !== 'undefined' && electionId
      ? `${window.location.origin}/hub/elections/${electionId}/results`
      : '');

  async function handleShare() {
    if (!resolvedShareUrl) return;
    const title = electionTitle ? `${electionTitle} — Official results` : 'NACOS election results';
    const text = `Official results for ${electionTitle ?? 'this election'} on NACOS Achievers Hub.`;

    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title, text, url: resolvedShareUrl });
        setShareMsg('Shared!');
      } else {
        await navigator.clipboard.writeText(resolvedShareUrl);
        setShareMsg('Link copied!');
      }
    } catch {
      try {
        await navigator.clipboard.writeText(resolvedShareUrl);
        setShareMsg('Link copied!');
      } catch {
        setShareMsg('Could not share');
      }
    }
    setTimeout(() => setShareMsg(''), 2500);
  }

  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f172a] via-[#134e4a] to-[#047857] p-6 text-white shadow-lg sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-200/80">
              NACOS Achievers Chapter
            </p>
            <h2 className="hub-display mt-2 text-3xl text-white sm:text-4xl">Official results</h2>
            {electionTitle && (
              <p className="mt-2 max-w-xl text-sm text-emerald-50/90">{electionTitle}</p>
            )}
          </div>
          {resolvedShareUrl && (
            <button
              type="button"
              onClick={() => void handleShare()}
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              <Share2 className="h-4 w-4" aria-hidden />
              {shareMsg || 'Share results'}
            </button>
          )}
        </div>

        {analytics && (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <HeroStat label="Ballots cast" value={String(analytics.unique_voters)} />
            <HeroStat
              label="Turnout"
              value={`${analytics.turnout_percentage}%`}
              hint={`of ${analytics.eligible_voters} eligible`}
            />
            <HeroStat label="Positions" value={String(analytics.contestable_positions)} />
            <HeroStat label="Contestants" value={String(analytics.total_contestants)} />
          </div>
        )}
      </div>

      {extended && (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-hub-muted)]">
            Election insights
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {extended.most_active_level && (
              <InsightCard
                label="Most active level"
                value={`Level ${extended.most_active_level.level}`}
                hint={`${extended.most_active_level.turnout_percentage}% turnout`}
              />
            )}
            {extended.least_active_level && (
              <InsightCard
                label="Least active level"
                value={`Level ${extended.least_active_level.level}`}
                hint={`${extended.least_active_level.turnout_percentage}% turnout`}
              />
            )}
            <InsightCard
              label="Turnout spread"
              value={`${extended.turnout_spread}%`}
              hint="Gap between highest and lowest level turnout"
            />
            <InsightCard
              label="Avg. winner share"
              value={`${extended.average_winner_share}%`}
              hint="Mean vote share of position winners"
            />
            <InsightCard
              label="Avg. winning margin"
              value={`${extended.average_winning_margin}%`}
              hint="Mean gap between 1st and 2nd place"
            />
            {extended.strongest_candidate && (
              <InsightCard
                label="Strongest win"
                value={extended.strongest_candidate.name}
                hint={`${extended.strongest_candidate.percentage}% · ${extended.strongest_candidate.position}`}
              />
            )}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-lg font-bold text-[var(--color-hub-text)]">Results by position</h3>
        <p className="mt-1 text-sm text-[var(--color-hub-text-secondary)]">
          Winners and vote share are calculated per position.
        </p>
      </div>

      <div className="space-y-6">
        {positions.map((pos) => (
          <PositionResultCard key={pos.id} position={pos} />
        ))}
        {positions.length === 0 && (
          <p className="hub-empty-state">No positions configured yet.</p>
        )}
      </div>

      {resolvedShareUrl && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--color-hub-border)] bg-[var(--color-hub-surface-muted)] p-4">
          <p className="min-w-0 flex-1 truncate font-mono text-xs text-[var(--color-hub-text-secondary)]">
            {resolvedShareUrl}
          </p>
          <button type="button" onClick={() => void handleShare()} className={hubBtnSecondary}>
            Copy / share link
          </button>
        </div>
      )}
    </div>
  );
}

function HeroStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-200/70">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-white">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-emerald-100/70">{hint}</p>}
    </div>
  );
}

function InsightCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="hub-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-hub-muted)]">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold text-[var(--color-brand)]">{value}</p>
      {hint && <p className="mt-1 text-xs text-[var(--color-hub-text-secondary)]">{hint}</p>}
    </div>
  );
}

function PositionResultCard({ position }: { position: ElectionPosition }) {
  const maxVotes = Math.max(...position.candidates.map((c) => c.vote_count ?? 0), 0);

  return (
    <section className="hub-card overflow-hidden p-0">
      <div className="border-b border-[var(--color-hub-border)] bg-[var(--color-hub-surface-muted)] px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-[var(--color-hub-text)]">{position.title}</h3>
          <span className="text-sm text-[var(--color-hub-text-secondary)]">
            {position.total_votes ?? 0} vote{(position.total_votes ?? 0) === 1 ? '' : 's'}
          </span>
        </div>
        {position.winner && !position.is_tie && (
          <p className="mt-2 text-sm text-[var(--color-brand)]">
            Winner: <strong>{position.winner.name}</strong> ({position.winner.vote_count} votes)
          </p>
        )}
        {position.is_tie && (
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
            Tie — multiple contestants share the lead
          </p>
        )}
      </div>
      <ul className="divide-y divide-[var(--color-hub-border)]">
        {position.candidates.map((c) => {
          const votes = c.vote_count ?? 0;
          const pct = c.vote_percentage ?? 0;
          const width = maxVotes > 0 ? (votes / maxVotes) * 100 : 0;
          return (
            <li key={c.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="font-medium text-[var(--color-hub-text)]">
                    {c.name}
                    {c.is_winner && (
                      <span className="ml-2 rounded-full bg-[var(--color-brand-soft)] px-2 py-0.5 text-xs font-bold text-[var(--color-brand)]">
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
                    <p className="mt-1 line-clamp-2 text-xs text-[var(--color-hub-text-secondary)]">
                      {c.manifesto}
                    </p>
                  )}
                </div>
                <div className="text-right text-sm font-semibold tabular-nums">
                  {votes} <span className="font-normal text-[var(--color-hub-muted)]">({pct}%)</span>
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-hub-surface-muted)]">
                <div
                  className={`h-full rounded-full transition-all ${
                    c.is_winner ? 'bg-[var(--color-brand)]' : 'bg-[var(--color-brand)]/40'
                  }`}
                  style={{ width: `${width}%` }}
                />
              </div>
            </li>
          );
        })}
        {position.candidates.length === 0 && (
          <li className="px-5 py-6 text-center text-sm text-[var(--color-hub-text-secondary)]">
            No contestants
          </li>
        )}
      </ul>
    </section>
  );
}

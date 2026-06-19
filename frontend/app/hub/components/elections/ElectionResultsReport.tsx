'use client';

import { useState } from 'react';
import { Download, Share2 } from 'lucide-react';
import type { ElectionAnalytics, ElectionPosition } from '@/lib/election-types';
import CandidatePhoto from '@/app/hub/components/elections/CandidatePhoto';
import { hubBtnSecondary } from '@/lib/hub-styles';
import {
  downloadElectionResultsCsv,
  downloadElectionResultsJson,
} from '@/lib/election-export';

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
              hint={`of ${analytics.eligible_voters} eligible students & executives`}
            />
            <HeroStat label="Positions" value={String(analytics.contestable_positions)} />
            <HeroStat label="Contestants" value={String(analytics.total_contestants)} />
          </div>
        )}
      </div>

      {positions.length > 0 && (
        <div className="hub-card p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-hub-muted)]">
            Winners by position
          </h3>
          <p className="mt-1 text-xs text-[var(--color-hub-text-secondary)]">
            Uncontested seats require at least one-third of eligible voters. Abstentions do not count
            toward a candidate&apos;s total.
          </p>
          <ul className="mt-4 divide-y divide-[var(--color-hub-border)]">
            {positions.map((pos) => (
              <li key={pos.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span className="font-medium text-[var(--color-hub-text)]">{pos.title}</span>
                <WinnerSummaryBadge position={pos} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            downloadElectionResultsCsv(electionTitle ?? 'Election', positions, analytics)
          }
          className={`${hubBtnSecondary} inline-flex items-center gap-2`}
        >
          <Download className="h-4 w-4" aria-hidden />
          Export CSV
        </button>
        <button
          type="button"
          onClick={() =>
            downloadElectionResultsJson(electionTitle ?? 'Election', positions, analytics)
          }
          className={`${hubBtnSecondary} inline-flex items-center gap-2`}
        >
          <Download className="h-4 w-4" aria-hidden />
          Export JSON
        </button>
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
            {(extended.strongest_wins?.length ?? 0) > 0 ? (
              <StrongestWinInsight wins={extended.strongest_wins!} />
            ) : (
              extended.strongest_candidate && (
                <InsightCard
                  label="Strongest win"
                  value={extended.strongest_candidate.name}
                  hint={`${extended.strongest_candidate.percentage}% · ${extended.strongest_candidate.position}`}
                />
              )
            )}
          </div>
        </div>
      )}

      {extended && extended.level_turnout.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-hub-muted)]">
            Turnout by level
          </h3>
          <div className="mt-3 overflow-x-auto rounded-xl border border-[var(--color-hub-border)]">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--color-hub-surface-muted)] text-xs uppercase text-[var(--color-hub-muted)]">
                <tr>
                  <th className="px-4 py-2 font-medium">Level</th>
                  <th className="px-4 py-2 font-medium">Eligible</th>
                  <th className="px-4 py-2 font-medium">Voted</th>
                  <th className="px-4 py-2 font-medium">Turnout</th>
                </tr>
              </thead>
              <tbody>
                {extended.level_turnout.map((l) => (
                  <tr key={l.level} className="border-t border-[var(--color-hub-border)]">
                    <td className="px-4 py-2">Level {l.level}</td>
                    <td className="px-4 py-2 tabular-nums">{l.eligible}</td>
                    <td className="px-4 py-2 tabular-nums">{l.voted}</td>
                    <td className="px-4 py-2 tabular-nums font-medium text-[var(--color-brand)]">
                      {l.turnout_percentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

function StrongestWinInsight({
  wins,
}: {
  wins: Array<{ name: string; position: string; percentage: number }>;
}) {
  const pct = wins[0]?.percentage ?? 0;
  const names = wins.map((w) => w.name).join(', ');
  const positions = wins.map((w) => w.position).join(', ');
  return (
    <InsightCard
      label="Strongest win"
      value={names}
      hint={`${pct}% · ${positions}`}
    />
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

function WinnerSummaryBadge({ position }: { position: ElectionPosition }) {
  if (position.contestant_count === 0) {
    return (
      <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
        Vacant
      </span>
    );
  }
  if (position.is_tie) {
    return (
      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900">
        Tie
      </span>
    );
  }
  if (position.quorum_not_met) {
    return (
      <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
        Quorum not met ({position.candidates[0]?.vote_count ?? 0}/
        {position.min_votes_required} needed)
      </span>
    );
  }
  if (position.winner) {
    return (
      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-900">
        {position.winner.name} · {position.winner.vote_count} votes
      </span>
    );
  }
  return (
    <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
      No winner
    </span>
  );
}

function PositionResultCard({ position }: { position: ElectionPosition }) {
  const maxVotes = Math.max(
    ...position.candidates.map((c) => c.vote_count ?? 0),
    position.abstention_count ?? 0,
  );
  const abstentions = position.abstention_count ?? 0;
  const abstainPct = position.abstention_percentage ?? 0;

  return (
    <section className="hub-card overflow-hidden p-0">
      <div className="border-b border-[var(--color-hub-border)] bg-[var(--color-hub-surface-muted)] px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-[var(--color-hub-text)]">{position.title}</h3>
          <span className="text-sm text-[var(--color-hub-text-secondary)]">
            {position.ballots_cast ?? position.total_votes ?? 0} ballot
            {(position.ballots_cast ?? position.total_votes ?? 0) === 1 ? '' : 's'} cast
          </span>
        </div>
        {position.winner && !position.is_tie && (
          <p className="mt-2 text-sm text-[var(--color-brand)]">
            Winner: <strong>{position.winner.name}</strong> ({position.winner.vote_count} votes)
          </p>
        )}
        {position.quorum_not_met && (
          <p className="mt-2 text-sm text-red-700 dark:text-red-400">
            Quorum not met — sole contestant needed at least {position.min_votes_required} votes
            (one-third of {position.eligible_voters} eligible voters).
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
                <div className="flex min-w-0 items-start gap-3">
                  <CandidatePhoto name={c.name} imageUrl={c.image_url} size="sm" />
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
                      {c.quorum_not_met && (
                        <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-800">
                          Below quorum
                        </span>
                      )}
                    </span>
                    {c.manifesto && (
                      <p className="mt-1 line-clamp-2 text-xs text-[var(--color-hub-text-secondary)]">
                        {c.manifesto}
                      </p>
                    )}
                  </div>
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
        {position.candidates.length > 0 && (
          <li className="px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className={`font-medium ${abstentions > 0 ? 'text-zinc-600' : 'text-[var(--color-hub-text-secondary)]'}`}>
                  None of the above (abstain)
                </span>
                <p className="mt-1 text-xs text-[var(--color-hub-text-secondary)]">
                  Voters who abstained on this position
                </p>
              </div>
              <div className="text-right text-sm font-semibold tabular-nums text-zinc-600">
                {abstentions}{' '}
                <span className="font-normal text-[var(--color-hub-muted)]">({abstainPct}%)</span>
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-hub-surface-muted)]">
              <div
                className="h-full rounded-full bg-zinc-400/60 transition-all"
                style={{ width: `${maxVotes > 0 ? (abstentions / maxVotes) * 100 : 0}%` }}
              />
            </div>
          </li>
        )}
        {position.candidates.length === 0 && (
          <li className="px-5 py-6 text-center text-sm text-[var(--color-hub-text-secondary)]">
            No contestants
          </li>
        )}
      </ul>
    </section>
  );
}

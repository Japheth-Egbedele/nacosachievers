import type { ElectionAnalytics, ElectionPosition } from '@/lib/election-types';

function csvEscape(value: string | number | null | undefined): string {
  const s = value == null ? '' : String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadBlob(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function positionOutcomeLabel(pos: ElectionPosition): string {
  if (pos.contestant_count === 0) return 'Vacant (no contestants)';
  if (pos.is_tie) return 'Tie';
  if (pos.quorum_not_met) return 'Quorum not met';
  if (pos.winner) return `Elected: ${pos.winner.name}`;
  return 'No winner';
}

export function downloadElectionResultsCsv(
  electionTitle: string,
  positions: ElectionPosition[],
  analytics?: ElectionAnalytics,
) {
  const lines: string[] = [];
  const slug = electionTitle.replace(/[^\w]+/g, '_').slice(0, 40) || 'election';

  lines.push('NACOS Achievers — Election results export');
  lines.push(`Election,${csvEscape(electionTitle)}`);
  lines.push(`Exported at,${csvEscape(new Date().toISOString())}`);
  if (analytics) {
    lines.push(`Ballots cast,${analytics.unique_voters}`);
    lines.push(`Eligible voters (students + executives),${analytics.eligible_voters}`);
    lines.push(`Turnout %,${analytics.turnout_percentage}`);
  }
  lines.push('');

  lines.push('Winners summary');
  lines.push('Position,Outcome,Votes');
  for (const pos of positions) {
    const votes = pos.winner?.vote_count ?? pos.candidates[0]?.vote_count ?? 0;
    lines.push(
      `${csvEscape(pos.title)},${csvEscape(positionOutcomeLabel(pos))},${votes}`,
    );
  }
  lines.push('');

  lines.push('Results by position');
  lines.push('Position,Contestant,Votes,Share %,Winner,Abstentions,Abstain %');
  for (const pos of positions) {
    for (const c of pos.candidates) {
      lines.push(
        [
          csvEscape(pos.title),
          csvEscape(c.name),
          c.vote_count ?? 0,
          c.vote_percentage ?? 0,
          c.is_winner ? 'Yes' : 'No',
          '',
          '',
        ].join(','),
      );
    }
    if (pos.candidates.length > 0) {
      lines.push(
        [
          csvEscape(pos.title),
          csvEscape('None of the above (abstain)'),
          0,
          pos.abstention_percentage ?? 0,
          'No',
          pos.abstention_count ?? 0,
          pos.abstention_percentage ?? 0,
        ].join(','),
      );
    }
  }
  lines.push('');

  const levels = analytics?.extended?.level_turnout ?? [];
  if (levels.length > 0) {
    lines.push('Turnout by level');
    lines.push('Level,Eligible,Voted,Turnout %');
    for (const l of levels) {
      lines.push(`Level ${l.level},${l.eligible},${l.voted},${l.turnout_percentage}`);
    }
  }

  downloadBlob(`${slug}_results.csv`, lines.join('\n'), 'text/csv;charset=utf-8');
}

export function downloadElectionResultsJson(
  electionTitle: string,
  positions: ElectionPosition[],
  analytics?: ElectionAnalytics,
) {
  const slug = electionTitle.replace(/[^\w]+/g, '_').slice(0, 40) || 'election';
  const payload = {
    election_title: electionTitle,
    exported_at: new Date().toISOString(),
    analytics,
    positions,
  };
  downloadBlob(
    `${slug}_results.json`,
    JSON.stringify(payload, null, 2),
    'application/json;charset=utf-8',
  );
}

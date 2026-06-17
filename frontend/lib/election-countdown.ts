export type ElectionTimePhase = 'upcoming_far' | 'upcoming_soon' | 'active' | 'completed';

export type ElectionTimeState = {
  phase: ElectionTimePhase;
  /** Milliseconds until start (positive) or until end when active */
  msRemaining: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function getElectionTimeState(
  startIso: string,
  endIso: string,
  nowMs = Date.now(),
): ElectionTimeState {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();

  if (nowMs >= end) {
    return { phase: 'completed', msRemaining: 0 };
  }
  if (nowMs >= start) {
    return { phase: 'active', msRemaining: end - nowMs };
  }
  const untilStart = start - nowMs;
  if (untilStart > DAY_MS) {
    return { phase: 'upcoming_far', msRemaining: untilStart };
  }
  return { phase: 'upcoming_soon', msRemaining: untilStart };
}

export function formatCountdownMs(ms: number, withLeadingMinus = false): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  let body: string;
  if (days > 0) {
    body = `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  } else {
    body = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return withLeadingMinus ? `-${body}` : body;
}

export function formatElectionOpensAt(startIso: string): string {
  return new Date(startIso).toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** `datetime-local` input value from ISO string (local timezone). */
export function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Minimum `datetime-local` value = now + 24 hours. */
export function minStartDatetimeLocal(): string {
  return toDatetimeLocalValue(new Date(Date.now() + DAY_MS).toISOString());
}

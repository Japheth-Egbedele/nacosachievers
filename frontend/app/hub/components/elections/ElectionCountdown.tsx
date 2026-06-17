'use client';

import { useEffect, useState } from 'react';
import {
  formatCountdownMs,
  formatElectionOpensAt,
  getElectionTimeState,
} from '@/lib/election-countdown';

type ElectionCountdownProps = {
  startDate: string;
  endDate: string;
  size?: 'sm' | 'lg';
  className?: string;
};

export default function ElectionCountdown({
  startDate,
  endDate,
  size = 'lg',
  className = '',
}: ElectionCountdownProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const state = getElectionTimeState(startDate, endDate, now);
  const isLarge = size === 'lg';

  if (state.phase === 'completed') {
    return (
      <div
        className={`inline-flex items-center rounded-full bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-600 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700 ${className}`}
      >
        Election closed
      </div>
    );
  }

  if (state.phase === 'upcoming_far') {
    return (
      <div className={`space-y-1 ${className}`}>
        <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
          Voting opens
        </p>
        <p className={`font-semibold text-emerald-800 dark:text-emerald-200 ${isLarge ? 'text-base' : 'text-sm'}`}>
          {formatElectionOpensAt(startDate)}
        </p>
        <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80">
          Countdown appears 24 hours before voting starts
        </p>
      </div>
    );
  }

  if (state.phase === 'upcoming_soon') {
    return (
      <div className={`space-y-1 ${className}`}>
        <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
          Voting opens in
        </p>
        <p
          className={`font-mono font-bold tabular-nums text-emerald-600 dark:text-emerald-400 ${
            isLarge ? 'text-3xl sm:text-4xl' : 'text-xl'
          }`}
        >
          {formatCountdownMs(state.msRemaining, true)}
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-1 ${className}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
        Time left to vote
      </p>
      <p
        className={`font-mono font-bold tabular-nums text-emerald-600 dark:text-emerald-400 ${
          isLarge ? 'text-3xl sm:text-4xl' : 'text-xl'
        }`}
      >
        {formatCountdownMs(state.msRemaining)}
      </p>
    </div>
  );
}

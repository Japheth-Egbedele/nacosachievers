'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { hubInput } from '@/lib/hub-styles';
import { apiFetch, ApiClientError } from '@/lib/api';

export interface LookupUser {
  id: string;
  matric_number: string;
  email: string;
  role: string;
  first_name: string;
  last_name: string;
  display_name?: string;
}

type HubMemberPickerProps = {
  value?: string;
  onSelect: (user: LookupUser | null) => void;
  placeholder?: string;
  disabled?: boolean;
};

function userLabel(u: LookupUser): string {
  const name = u.display_name?.trim() || `${u.first_name} ${u.last_name}`.trim();
  return `${name} · ${u.matric_number}`;
}

export default function HubMemberPicker({
  value,
  onSelect,
  placeholder = 'Search by name, matric, or email…',
  disabled = false,
}: HubMemberPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LookupUser[]>([]);
  const [selected, setSelected] = useState<LookupUser | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!value) {
      const t = window.setTimeout(() => setSelected(null), 0);
      return () => window.clearTimeout(t);
    }
    if (selected?.id === value) return;
    const t = window.setTimeout(() => setSelected(null), 0);
    return () => window.clearTimeout(t);
  }, [value, selected?.id]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const search = useCallback(async (term: string) => {
    const q = term.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch<LookupUser[]>(
        `/users/lookup?search=${encodeURIComponent(q)}&limit=15`,
      );
      setResults(data);
    } catch (err) {
      if (!(err instanceof ApiClientError)) setResults([]);
      else setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || selected) return;
    const timer = window.setTimeout(() => void search(query), 300);
    return () => window.clearTimeout(timer);
  }, [query, open, selected, search]);

  function pick(user: LookupUser) {
    setSelected(user);
    setQuery(userLabel(user));
    setOpen(false);
    onSelect(user);
  }

  function clear() {
    setSelected(null);
    setQuery('');
    setResults([]);
    onSelect(null);
  }

  const displayValue = selected ? userLabel(selected) : query;

  return (
    <div ref={containerRef} className="relative">
      <div className="flex gap-2">
        <input
          type="text"
          value={displayValue}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => {
            setSelected(null);
            setQuery(e.target.value);
            setOpen(true);
            onSelect(null);
          }}
          onFocus={() => setOpen(true)}
          className={`${hubInput} flex-1`}
          autoComplete="off"
        />
        {(selected || query) && !disabled && (
          <button
            type="button"
            onClick={clear}
            className="shrink-0 rounded-xl border border-[var(--color-hub-border)] px-3 text-xs text-[var(--color-hub-text-secondary)] transition hover:bg-[var(--color-hub-surface-muted)]"
          >
            Clear
          </button>
        )}
      </div>

      {open && !selected && query.trim().length >= 2 && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-[var(--color-hub-border)] bg-[var(--color-hub-surface)] py-1 shadow-lg">
          {loading && (
            <li className="px-3 py-2 text-xs text-[var(--color-hub-text-secondary)]">Searching…</li>
          )}
          {!loading && results.length === 0 && (
            <li className="px-3 py-2 text-xs text-[var(--color-hub-text-secondary)]">
              No members found.
            </li>
          )}
          {results.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => pick(u)}
                className="w-full px-3 py-2 text-left text-sm transition hover:bg-[var(--color-hub-surface-muted)]"
              >
                <span className="font-medium text-[var(--color-hub-text)]">
                  {u.display_name?.trim() || `${u.first_name} ${u.last_name}`}
                </span>
                <span className="ml-2 font-mono text-xs text-[var(--color-hub-text-secondary)]">
                  {u.matric_number}
                </span>
                <span className="ml-2 text-xs capitalize text-[var(--color-hub-muted)]">
                  {u.role.replace('_', ' ')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

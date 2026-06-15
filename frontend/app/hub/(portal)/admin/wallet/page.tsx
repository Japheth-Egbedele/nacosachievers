'use client';

import { useEffect, useState } from 'react';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import HubField, { HubTextInput } from '@/app/hub/components/ui/HubField';
import HubMemberPicker, { type LookupUser } from '@/app/hub/components/ui/HubMemberPicker';
import HubAlert from '@/app/hub/components/ui/HubAlert';
import HubPillTabs from '@/app/hub/components/ui/HubPillTabs';
import { hubBtnPrimary, hubBtnSecondary } from '@/lib/hub-styles';
import { apiFetchPaginated, apiFetch, ApiClientError } from '@/lib/api';
import { formatBytes } from '@/lib/vault-format';

interface Tx {
  id: string;
  amount: number;
  type: string;
  remark: string;
  created_at: string;
}

interface TreasurySummary {
  balance: number;
  default_vault_reward: number;
  total_issued_upload_rewards: number;
}

interface StorageUsage {
  total_bytes: number;
  quota_bytes: number;
  percent_used: number;
  buckets: { bucket: string; bytes: number; object_count: number }[];
}

type CreditRow = {
  key: string;
  recipient: LookupUser | null;
  amount: string;
};

const MAX_BULK = 100;

function emptyRow(): CreditRow {
  return { key: crypto.randomUUID(), recipient: null, amount: '' };
}

export default function AdminWalletPage() {
  const [txs, setTxs] = useState<Tx[]>([]);
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [recipient, setRecipient] = useState<LookupUser | null>(null);
  const [amount, setAmount] = useState('');
  const [remark, setRemark] = useState('Admin credit');
  const [bulkRows, setBulkRows] = useState<CreditRow[]>([emptyRow(), emptyRow(), emptyRow()]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [treasury, setTreasury] = useState<TreasurySummary | null>(null);
  const [storage, setStorage] = useState<StorageUsage | null>(null);
  const [fundAmount, setFundAmount] = useState('');
  const [fundRemark, setFundRemark] = useState('Chapter budget allocation');

  const load = () => {
    apiFetchPaginated<Tx>('/admin/wallet/transactions?limit=30')
      .then((r) => setTxs(r.items))
      .catch(() => setTxs([]));
    apiFetch<TreasurySummary>('/admin/wallet/treasury')
      .then(setTreasury)
      .catch(() => setTreasury(null));
    apiFetch<StorageUsage>('/admin/storage/usage')
      .then(setStorage)
      .catch(() => setStorage(null));
  };

  useEffect(() => {
    load();
  }, []);

  async function creditSingle(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const amt = parseInt(amount, 10);
    if (!recipient || !Number.isFinite(amt) || amt <= 0) {
      setError('Select a member and enter a positive amount');
      return;
    }
    setBusy(true);
    try {
      await apiFetch('/admin/wallet/credit', {
        method: 'POST',
        body: JSON.stringify({
          remark: remark.trim(),
          credits: [{ user_id: recipient.id, amount: amt }],
        }),
      });
      setRecipient(null);
      setAmount('');
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Credit failed');
    } finally {
      setBusy(false);
    }
  }

  async function creditBulk(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const credits = bulkRows
      .map((row) => ({
        user_id: row.recipient?.id,
        amount: parseInt(row.amount, 10),
      }))
      .filter((row) => row.user_id && Number.isFinite(row.amount) && row.amount! > 0) as Array<{
      user_id: string;
      amount: number;
    }>;

    if (credits.length === 0) {
      setError('Add at least one member with a positive credit amount');
      return;
    }
    if (credits.length > MAX_BULK) {
      setError(`Maximum ${MAX_BULK} credits per request`);
      return;
    }

    setBusy(true);
    try {
      await apiFetch('/admin/wallet/credit', {
        method: 'POST',
        body: JSON.stringify({ remark: remark.trim(), credits }),
      });
      setBulkRows([emptyRow(), emptyRow(), emptyRow()]);
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Bulk credit failed');
    } finally {
      setBusy(false);
    }
  }

  async function fundTreasury(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const amt = parseInt(fundAmount, 10);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('Enter a positive amount');
      return;
    }
    setBusy(true);
    try {
      await apiFetch('/admin/wallet/treasury/fund', {
        method: 'POST',
        body: JSON.stringify({ amount: amt, remark: fundRemark.trim() }),
      });
      setFundAmount('');
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Fund treasury failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <AdminPageHeader title="Wallet" description="Credit members, fund chapter treasury, and monitor storage." />
      {error && <HubAlert variant="error" className="mb-4">{error}</HubAlert>}

      <div className="mb-8 grid gap-4 md:grid-cols-2">
        {treasury && (
          <div className="rounded-xl border border-[var(--color-hub-border)] p-4">
            <h3 className="font-semibold">Chapter treasury</h3>
            <p className="mt-2 text-2xl font-bold">{treasury.balance} credits</p>
            <p className="text-xs text-[var(--color-hub-text-secondary)]">
              Default vault reward: {treasury.default_vault_reward} · Total issued (upload rewards):{' '}
              {treasury.total_issued_upload_rewards}
            </p>
            <form onSubmit={fundTreasury} className="mt-4 space-y-2">
              <HubTextInput
                type="number"
                min={1}
                placeholder="Amount to fund"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
              />
              <HubTextInput value={fundRemark} onChange={(e) => setFundRemark(e.target.value)} placeholder="Remark" />
              <button type="submit" disabled={busy} className={hubBtnSecondary}>
                Fund treasury
              </button>
            </form>
          </div>
        )}
        {storage && (
          <div className="rounded-xl border border-[var(--color-hub-border)] p-4">
            <h3 className="font-semibold">Storage usage</h3>
            <p className="mt-2 text-sm">
              {formatBytes(storage.total_bytes)} / {formatBytes(storage.quota_bytes)} ({storage.percent_used}%)
            </p>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-zinc-200">
              <div
                className={`h-full ${storage.percent_used >= 95 ? 'bg-red-600' : storage.percent_used >= 80 ? 'bg-amber-500' : 'bg-[var(--color-brand)]'}`}
                style={{ width: `${Math.min(100, storage.percent_used)}%` }}
              />
            </div>
            {storage.percent_used >= 80 && (
              <HubAlert
                variant="info"
                className={`mt-3 text-xs ${storage.percent_used >= 95 ? 'border-red-200 bg-red-50 text-red-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}
              >
                {storage.percent_used >= 95
                  ? 'Storage nearly full — uploads may fail soon. Review vault files or upgrade Supabase plan.'
                  : 'Storage nearly full — review vault uploads or plan Supabase Pro upgrade.'}
              </HubAlert>
            )}
            <ul className="mt-3 space-y-1 text-xs text-[var(--color-hub-text-secondary)]">
              {storage.buckets.map((b) => (
                <li key={b.bucket}>
                  {b.bucket}: {formatBytes(b.bytes)} ({b.object_count} objects)
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <HubPillTabs
        tabs={[
          { key: 'single', label: 'Single credit' },
          { key: 'bulk', label: 'Bulk credit' },
        ]}
        active={mode}
        onChange={(k) => setMode(k as 'single' | 'bulk')}
      />

      {mode === 'single' ? (
        <form onSubmit={creditSingle} className="mb-8 mt-6 max-w-lg space-y-4 rounded-xl border border-[var(--color-hub-border)] p-4">
          <HubField label="Member">
            <HubMemberPicker
              value={recipient?.id}
              onSelect={setRecipient}
              placeholder="Search member by name or matric…"
            />
          </HubField>
          <HubField label="Credits amount">
            <HubTextInput
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Credits amount"
            />
          </HubField>
          <HubField label="Remark">
            <HubTextInput value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Remark" />
          </HubField>
          <button type="submit" disabled={busy} className={hubBtnPrimary}>
            {busy ? 'Crediting…' : 'Credit wallet'}
          </button>
        </form>
      ) : (
        <form onSubmit={creditBulk} className="mb-8 mt-6 space-y-4 rounded-xl border border-[var(--color-hub-border)] p-4">
          <HubField label="Remark (applies to all rows)">
            <HubTextInput value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Remark" />
          </HubField>
          <div className="space-y-3">
            {bulkRows.map((row, index) => (
              <div key={row.key} className="flex flex-wrap items-end gap-2 rounded-lg bg-[var(--color-hub-surface-muted)] p-3">
                <span className="w-6 text-xs font-medium text-zinc-500">{index + 1}.</span>
                <div className="min-w-[12rem] flex-1">
                  <HubMemberPicker
                    value={row.recipient?.id}
                    onSelect={(user) =>
                      setBulkRows((prev) =>
                        prev.map((r) => (r.key === row.key ? { ...r, recipient: user } : r)),
                      )
                    }
                    placeholder="Member…"
                  />
                </div>
                <HubTextInput
                  type="number"
                  min={1}
                  className="w-28"
                  value={row.amount}
                  onChange={(e) =>
                    setBulkRows((prev) =>
                      prev.map((r) => (r.key === row.key ? { ...r, amount: e.target.value } : r)),
                    )
                  }
                  placeholder="Credits"
                />
                <button
                  type="button"
                  className="text-xs text-red-600"
                  onClick={() =>
                    setBulkRows((prev) =>
                      prev.length <= 1 ? prev : prev.filter((r) => r.key !== row.key),
                    )
                  }
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={bulkRows.length >= MAX_BULK}
              className={hubBtnSecondary}
              onClick={() => setBulkRows((prev) => [...prev, emptyRow()])}
            >
              Add row
            </button>
            <button type="submit" disabled={busy} className={hubBtnPrimary}>
              {busy ? 'Crediting…' : `Credit ${bulkRows.length} row(s)`}
            </button>
          </div>
        </form>
      )}

      <ul className="space-y-2 text-sm">
        {txs.map((t) => (
          <li key={t.id} className="rounded-lg border border-[var(--color-hub-border)] px-4 py-2">
            <span className="font-medium">{t.type}</span> {t.amount > 0 ? '+' : ''}
            {t.amount} — {t.remark}
            <div className="text-xs text-[var(--color-hub-text-secondary)]">
              {new Date(t.created_at).toLocaleString()}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

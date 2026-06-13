'use client';

import { useEffect, useState } from 'react';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import HubField, { HubTextInput } from '@/app/hub/components/ui/HubField';
import HubMemberPicker, { type LookupUser } from '@/app/hub/components/ui/HubMemberPicker';
import HubAlert from '@/app/hub/components/ui/HubAlert';
import HubPillTabs from '@/app/hub/components/ui/HubPillTabs';
import { hubBtnPrimary, hubBtnSecondary } from '@/lib/hub-styles';
import { apiFetchPaginated, apiFetch, ApiClientError } from '@/lib/api';

interface Tx {
  id: string;
  amount: number;
  type: string;
  remark: string;
  created_at: string;
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

  const load = () => {
    apiFetchPaginated<Tx>('/admin/wallet/transactions?limit=30')
      .then((r) => setTxs(r.items))
      .catch(() => setTxs([]));
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

  return (
    <div>
      <AdminPageHeader title="Wallet" description="Credit members individually or in bulk (up to 100)." />
      {error && <HubAlert variant="error" className="mb-4">{error}</HubAlert>}

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

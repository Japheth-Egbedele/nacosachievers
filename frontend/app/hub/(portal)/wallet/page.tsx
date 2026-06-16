'use client';

import { useEffect, useState } from 'react';
import { SpinnerCenter } from '@/app/components/Spinner';
import HubAlert from '@/app/hub/components/ui/HubAlert';
import HubField, { HubTextInput } from '@/app/hub/components/ui/HubField';
import HubMemberPicker, { type LookupUser } from '@/app/hub/components/ui/HubMemberPicker';
import { HubList, HubListCard, HubListEmpty } from '@/app/hub/components/ui/HubListCard';
import HubPageHeader from '@/app/hub/components/ui/HubPageHeader';
import { hubBtnPrimary } from '@/lib/hub-styles';
import { apiFetch, apiFetchPaginated, ApiClientError } from '@/lib/api';

interface Transaction {
  id: string;
  amount: number;
  type: string;
  remark: string;
  created_at: string;
}

export default function WalletPage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [recipient, setRecipient] = useState<LookupUser | null>(null);
  const [amount, setAmount] = useState('');
  const [remark, setRemark] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    setLoading(true);
    Promise.all([
      apiFetch<{ balance: number }>('/wallet/balance'),
      apiFetchPaginated<Transaction>('/wallet/transactions?limit=30'),
    ])
      .then(([bal, tx]) => {
        setBalance(bal.balance);
        setTransactions(tx.items);
      })
      .catch(() => {
        setBalance(null);
        setTransactions([]);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const t = window.setTimeout(() => load(), 0);
    return () => window.clearTimeout(t);
  }, []);

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    const amt = parseInt(amount, 10);
    if (!recipient || !Number.isFinite(amt) || amt <= 0) {
      setError('Select a recipient and enter a positive amount');
      return;
    }
    setBusy(true);
    try {
      await apiFetch('/wallet/transfer', {
        method: 'POST',
        body: JSON.stringify({
          recipient_id: recipient.id,
          amount: amt,
          remark: remark.trim() || 'Transfer',
        }),
      });
      setRecipient(null);
      setAmount('');
      setRemark('');
      setSuccess('Transfer completed.');
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Transfer failed');
    } finally {
      setBusy(false);
    }
  }

  if (loading && balance === null) {
    return <SpinnerCenter label="Loading wallet…" />;
  }

  return (
    <div>
      <HubPageHeader
        title="Wallet"
        description="View your balance, send credits to members, and review recent activity."
      />

      {error && <HubAlert variant="error" className="mb-4">{error}</HubAlert>}
      {success && <HubAlert variant="success" className="mb-4">{success}</HubAlert>}

      <div className="hub-card-muted mb-8 inline-block rounded-2xl px-6 py-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-hub-muted)]">
          Available balance
        </p>
        <p className="hub-display mt-1 text-3xl text-[var(--color-brand)]">
          {balance ?? 0} <span className="text-lg font-medium text-[var(--color-hub-text-secondary)]">credits</span>
        </p>
      </div>

      <form onSubmit={handleTransfer} className="mb-10 max-w-lg space-y-4 rounded-2xl border border-[var(--color-hub-border)] p-5">
        <h2 className="text-sm font-semibold text-[var(--color-hub-text)]">Transfer credits</h2>
        <HubField label="Recipient">
          <HubMemberPicker
            value={recipient?.id}
            onSelect={setRecipient}
            placeholder="Search member by name or matric…"
          />
        </HubField>
        <HubField label="Amount">
          <HubTextInput
            type="number"
            min={1}
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Credits to send"
          />
        </HubField>
        <HubField label="Remark (optional)">
          <HubTextInput
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="What is this for?"
          />
        </HubField>
        <button type="submit" disabled={busy} className={hubBtnPrimary}>
          {busy ? 'Sending…' : 'Send credits'}
        </button>
      </form>

      <h2 className="mb-3 text-sm font-semibold text-[var(--color-hub-text)]">Recent transactions</h2>
      <HubList>
        {transactions.length === 0 && <HubListEmpty title="No transactions yet" />}
        {transactions.map((t) => (
          <HubListCard key={t.id} className="block">
            <div>
              <p className="font-medium">
                <span className="capitalize">{t.type.replace('_', ' ')}</span>
                {' · '}
                <span className={t.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                  {t.amount > 0 ? '+' : ''}
                  {t.amount}
                </span>
              </p>
              <p className="text-sm text-[var(--color-hub-text-secondary)]">{t.remark}</p>
              <p className="text-xs text-[var(--color-hub-muted)]">
                {new Date(t.created_at).toLocaleString()}
              </p>
            </div>
          </HubListCard>
        ))}
      </HubList>
    </div>
  );
}

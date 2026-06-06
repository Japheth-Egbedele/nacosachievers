'use client';

import { useEffect, useState } from 'react';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import HubField, { HubTextInput } from '@/app/hub/components/ui/HubField';
import HubMemberPicker, { type LookupUser } from '@/app/hub/components/ui/HubMemberPicker';
import HubAlert from '@/app/hub/components/ui/HubAlert';
import { hubBtnPrimary } from '@/lib/hub-styles';
import { apiFetchPaginated, apiFetch, ApiClientError } from '@/lib/api';

interface Tx {
  id: string;
  amount: number;
  type: string;
  remark: string;
  created_at: string;
}

export default function AdminWalletPage() {
  const [txs, setTxs] = useState<Tx[]>([]);
  const [recipient, setRecipient] = useState<LookupUser | null>(null);
  const [amount, setAmount] = useState('');
  const [remark, setRemark] = useState('Admin credit');
  const [error, setError] = useState('');

  const load = () => {
    apiFetchPaginated<Tx>('/admin/wallet/transactions?limit=30')
      .then((r) => setTxs(r.items))
      .catch(() => setTxs([]));
  };

  useEffect(() => {
    load();
  }, []);

  async function credit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const amt = parseInt(amount, 10);
    if (!recipient || !Number.isFinite(amt) || amt <= 0) {
      setError('Select a member and enter a positive amount');
      return;
    }
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
    }
  }

  return (
    <div>
      <AdminPageHeader title="Wallet" description="Bulk credit members and view recent transactions." />
      {error && <HubAlert variant="error" className="mb-4">{error}</HubAlert>}
      <form onSubmit={credit} className="mb-8 max-w-lg space-y-4 rounded-xl border border-[var(--color-hub-border)] p-4">
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
          <HubTextInput
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="Remark"
          />
        </HubField>
        <button type="submit" className={hubBtnPrimary}>
          Credit wallet
        </button>
      </form>
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

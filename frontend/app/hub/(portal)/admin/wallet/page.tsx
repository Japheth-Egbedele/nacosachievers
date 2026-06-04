'use client';

import { useEffect, useState } from 'react';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
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
  const [userId, setUserId] = useState('');
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
    if (!userId.trim() || !Number.isFinite(amt) || amt <= 0) {
      setError('User UUID and positive amount required');
      return;
    }
    try {
      await apiFetch('/admin/wallet/credit', {
        method: 'POST',
        body: JSON.stringify({
          remark: remark.trim(),
          credits: [{ user_id: userId.trim(), amount: amt }],
        }),
      });
      setUserId('');
      setAmount('');
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Credit failed');
    }
  }

  return (
    <div>
      <AdminPageHeader title="Wallet" description="Bulk credit members and view recent transactions." />
      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <form onSubmit={credit} className="mb-8 max-w-lg space-y-3 rounded-xl border p-4 dark:border-zinc-800">
        <input
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="Member user UUID"
          className="w-full rounded-lg border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Credits amount"
          className="w-full rounded-lg border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <input
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          placeholder="Remark"
          className="w-full rounded-lg border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white">
          Credit wallet
        </button>
      </form>
      <ul className="space-y-2 text-sm">
        {txs.map((t) => (
          <li key={t.id} className="rounded-lg border px-4 py-2 dark:border-zinc-800">
            <span className="font-medium">{t.type}</span> {t.amount > 0 ? '+' : ''}
            {t.amount} — {t.remark}
            <div className="text-xs text-zinc-500">{new Date(t.created_at).toLocaleString()}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

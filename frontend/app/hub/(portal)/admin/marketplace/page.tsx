'use client';

import { useEffect, useState } from 'react';
import { SpinnerCenter } from '@/app/components/Spinner';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import { apiFetchPaginated, apiFetch, ApiClientError } from '@/lib/api';

interface Order {
  id: string;
  status: string;
  credits_spent: number;
  created_at: string;
  item?: { name: string };
}

interface Item {
  id: string;
  name: string;
  price_in_credits: number;
  stock_count: number | null;
}

export default function AdminMarketplacePage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState('');
  const [cost, setCost] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      apiFetchPaginated<Order>('/admin/marketplace/orders?limit=30'),
      apiFetchPaginated<Item>('/marketplace/items?limit=50'),
    ])
      .then(([ordersRes, itemsRes]) => {
        setOrders(ordersRes.items);
        setItems(itemsRes.items);
      })
      .catch(() => {
        setOrders([]);
        setItems([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  async function createItem(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const fd = new FormData();
    fd.append('name', name.trim());
    fd.append('price_in_credits', cost);
    fd.append('item_type', 'physical');
    fd.append('stock_count', '10');
    try {
      await apiFetch('/admin/marketplace/items', { method: 'POST', body: fd });
      setName('');
      setCost('');
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Create failed');
    }
  }

  async function fulfill(id: string) {
    try {
      await apiFetch(`/admin/marketplace/orders/${id}/fulfill`, {
        method: 'PATCH',
        body: JSON.stringify({}),
      });
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Fulfill failed');
    }
  }

  return (
    <div>
      <AdminPageHeader title="Marketplace" description="Manage redeemable items and fulfill orders." />
      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <form onSubmit={createItem} className="mb-6 flex flex-wrap gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Item name"
          className="rounded-lg border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          required
        />
        <input
          type="number"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          placeholder="Credit cost"
          className="w-28 rounded-lg border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          required
        />
        <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white">
          Add item
        </button>
      </form>
      {loading ? (
        <SpinnerCenter />
      ) : (
        <>
      <h2 className="mb-2 text-sm font-semibold text-zinc-700">Items</h2>
      <ul className="mb-8 space-y-1 text-sm">
        {items.map((i) => (
          <li key={i.id}>
            {i.name} — {i.price_in_credits} credits (stock {i.stock_count ?? '∞'})
          </li>
        ))}
      </ul>
      <h2 className="mb-2 text-sm font-semibold text-zinc-700">Orders</h2>
      <ul className="space-y-2">
        {orders.map((o) => (
          <li
            key={o.id}
            className="flex justify-between rounded-xl border px-4 py-3 text-sm dark:border-zinc-800"
          >
            <div>
              {o.item?.name ?? 'Item'} — {o.status} ({o.credits_spent} cr)
            </div>
            {o.status === 'pending' && (
              <button type="button" onClick={() => fulfill(o.id)} className="text-emerald-600">
                Fulfill
              </button>
            )}
          </li>
        ))}
      </ul>
        </>
      )}
    </div>
  );
}

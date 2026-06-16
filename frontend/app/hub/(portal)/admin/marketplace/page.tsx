'use client';

import { useEffect, useState } from 'react';
import { SpinnerCenter } from '@/app/components/Spinner';
import HubAlert from '@/app/hub/components/ui/HubAlert';
import { HubList, HubListCard } from '@/app/hub/components/ui/HubListCard';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import { hubBtnPrimary, hubInput, hubLink } from '@/lib/hub-styles';
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
    const t = window.setTimeout(() => load(), 0);
    return () => window.clearTimeout(t);
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
      {error && <HubAlert variant="error" className="mb-4">{error}</HubAlert>}
      <form onSubmit={createItem} className="mb-6 flex flex-wrap gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Item name"
          className={`${hubInput} min-w-[10rem] flex-1`}
          required
        />
        <input
          type="number"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          placeholder="Credit cost"
          className={`${hubInput} w-28`}
          required
        />
        <button type="submit" className={`${hubBtnPrimary} w-auto px-5`}>
          Add item
        </button>
      </form>
      {loading ? (
        <SpinnerCenter />
      ) : (
        <>
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-hub-text)]">Items</h2>
          <HubList className="mb-8">
            {items.map((i) => (
              <HubListCard key={i.id} className="block text-sm">
                <span className="text-[var(--color-hub-text)]">{i.name}</span>
                <span className="text-[var(--color-hub-text-secondary)]">
                  {i.price_in_credits} credits · stock {i.stock_count ?? '∞'}
                </span>
              </HubListCard>
            ))}
          </HubList>
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-hub-text)]">Orders</h2>
          <HubList>
            {orders.map((o) => (
              <HubListCard key={o.id} className="text-sm">
                <div className="text-[var(--color-hub-text)]">
                  {o.item?.name ?? 'Item'} — {o.status} ({o.credits_spent} cr)
                </div>
                {o.status === 'pending' && (
                  <button type="button" onClick={() => fulfill(o.id)} className={hubLink}>
                    Fulfill
                  </button>
                )}
              </HubListCard>
            ))}
          </HubList>
        </>
      )}
    </div>
  );
}

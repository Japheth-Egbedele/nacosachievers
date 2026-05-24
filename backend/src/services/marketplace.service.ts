import { v4 as uuidv4 } from 'uuid';
import { getSupabase } from '../config/supabase.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { parsePagination, buildMeta } from '../utils/pagination.js';
import type { PaginationMeta } from '../utils/response.js';
import * as walletService from './wallet.service.js';
import * as storageService from './storage.service.js';
import * as notificationService from './notification.service.js';

export interface MarketplaceItem {
  id: string;
  name: string;
  description: string | null;
  price_in_credits: number;
  item_type: 'digital' | 'physical';
  stock_count: number | null;
  image_url: string | null;
  is_available: boolean;
  digital_delivery_content: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Lists available marketplace items.
 */
export async function listItems(query: {
  page?: unknown;
  limit?: unknown;
  item_type?: string;
  in_stock_only?: boolean;
}): Promise<{ items: MarketplaceItem[]; meta: PaginationMeta }> {
  const { page, limit, offset } = parsePagination(query);

  let dbQuery = getSupabase()
    .from('marketplace_items')
    .select('*', { count: 'exact' })
    .eq('is_available', true)
    .order('created_at', { ascending: false });

  if (query.item_type) dbQuery = dbQuery.eq('item_type', query.item_type);
  if (query.in_stock_only) {
    dbQuery = dbQuery.or('stock_count.is.null,stock_count.gt.0');
  }

  const { data, count, error } = await dbQuery.range(offset, offset + limit - 1);
  if (error) throw error;

  return {
    items: (data ?? []) as MarketplaceItem[],
    meta: buildMeta(count ?? 0, page, limit),
  };
}

/**
 * Returns a single marketplace item.
 */
export async function getItem(id: string): Promise<MarketplaceItem> {
  const { data, error } = await getSupabase()
    .from('marketplace_items')
    .select('*')
    .eq('id', id)
    .eq('is_available', true)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new NotFoundError('Item not found');

  return data as MarketplaceItem;
}

/**
 * Redeems a marketplace item for credits.
 */
export async function redeemItem(input: {
  userId: string;
  itemId: string;
  quantity: number;
  remark: string;
}): Promise<{ order_id: string; digital_delivery_content?: string | null }> {
  if (input.remark.length < 3) {
    throw new ValidationError('Remark must be at least 3 characters');
  }

  const { data: item } = await getSupabase()
    .from('marketplace_items')
    .select('*')
    .eq('id', input.itemId)
    .eq('is_available', true)
    .maybeSingle();

  if (!item) throw new NotFoundError('Item not found');

  if (item.stock_count !== null && item.stock_count < input.quantity) {
    throw new ValidationError('Insufficient stock');
  }

  const totalCost = item.price_in_credits * input.quantity;

  const { data: user } = await getSupabase()
    .from('users')
    .select('wallet_balance')
    .eq('id', input.userId)
    .maybeSingle();

  if (!user || user.wallet_balance < totalCost) {
    throw new ValidationError('Insufficient balance');
  }

  await walletService.debitUser({
    userId: input.userId,
    amount: totalCost,
    type: 'redemption',
    remark: input.remark,
    referenceId: input.itemId,
  });

  const { data: tx } = await getSupabase()
    .from('wallet_transactions')
    .select('id')
    .eq('user_id', input.userId)
    .eq('type', 'redemption')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (item.stock_count !== null) {
    await getSupabase()
      .from('marketplace_items')
      .update({
        stock_count: item.stock_count - input.quantity,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.itemId);
  }

  const { data: order, error: orderError } = await getSupabase()
    .from('orders')
    .insert({
      user_id: input.userId,
      item_id: input.itemId,
      quantity: input.quantity,
      total_credits_spent: totalCost,
      status: 'pending',
      transaction_id: tx?.id ?? null,
    })
    .select('id')
    .single();

  if (orderError) throw orderError;

  await notificationService.createNotification({
    userId: input.userId,
    title: 'Order placed',
    body: `Your order for "${item.name}" has been received.`,
    type: 'order_update',
    referenceId: order.id,
  });

  return {
    order_id: order.id,
    digital_delivery_content:
      item.item_type === 'digital' ? item.digital_delivery_content : undefined,
  };
}

/**
 * Lists orders for the authenticated user.
 */
export async function listMyOrders(
  userId: string,
  query: { page?: unknown; limit?: unknown },
): Promise<{ items: unknown[]; meta: PaginationMeta }> {
  const { page, limit, offset } = parsePagination(query);

  const { data, count, error } = await getSupabase()
    .from('orders')
    .select('*, marketplace_items(name, item_type, image_url)', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  return { items: data ?? [], meta: buildMeta(count ?? 0, page, limit) };
}

/**
 * Admin: creates a marketplace item.
 */
export async function createItem(
  input: {
    name: string;
    description?: string;
    price_in_credits: number;
    item_type: 'digital' | 'physical';
    stock_count?: number | null;
    digital_delivery_content?: string;
    createdBy: string;
  },
  imageFile?: Express.Multer.File,
): Promise<MarketplaceItem> {
  let imageUrl: string | null = null;

  if (imageFile) {
    const ext = imageFile.mimetype.split('/')[1] ?? 'jpg';
    const path = `marketplace/${uuidv4()}.${ext}`;
    imageUrl = await storageService.uploadFile(
      'public-images',
      path,
      imageFile.buffer,
      imageFile.mimetype,
    );
  }

  const { data, error } = await getSupabase()
    .from('marketplace_items')
    .insert({
      name: input.name,
      description: input.description ?? null,
      price_in_credits: input.price_in_credits,
      item_type: input.item_type,
      stock_count: input.stock_count ?? null,
      digital_delivery_content: input.digital_delivery_content ?? null,
      image_url: imageUrl,
      created_by: input.createdBy,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as MarketplaceItem;
}

/**
 * Admin: updates a marketplace item.
 */
export async function updateItem(
  id: string,
  updates: Record<string, unknown>,
  imageFile?: Express.Multer.File,
): Promise<MarketplaceItem> {
  const { data: existing } = await getSupabase()
    .from('marketplace_items')
    .select('image_url')
    .eq('id', id)
    .maybeSingle();

  if (!existing) throw new NotFoundError('Item not found');

  const patch: Record<string, unknown> = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  if (imageFile) {
    const ext = imageFile.mimetype.split('/')[1] ?? 'jpg';
    const path = `marketplace/${uuidv4()}.${ext}`;
    patch.image_url = await storageService.uploadFile(
      'public-images',
      path,
      imageFile.buffer,
      imageFile.mimetype,
    );
    if (existing.image_url) {
      const oldPath = storageService.extractPathFromUrl(existing.image_url, 'public-images');
      await storageService.deleteFile('public-images', oldPath).catch(() => undefined);
    }
  }

  const { data, error } = await getSupabase()
    .from('marketplace_items')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data as MarketplaceItem;
}

/**
 * Admin: soft-deletes a marketplace item.
 */
export async function deleteItem(id: string): Promise<void> {
  const { data } = await getSupabase()
    .from('marketplace_items')
    .update({ is_available: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id');

  if (!data?.length) throw new NotFoundError('Item not found');
}

/**
 * Admin: lists all orders.
 */
export async function listAdminOrders(query: {
  page?: unknown;
  limit?: unknown;
  status?: string;
}): Promise<{ items: unknown[]; meta: PaginationMeta }> {
  const { page, limit, offset } = parsePagination(query);

  let dbQuery = getSupabase()
    .from('orders')
    .select(
      '*, marketplace_items(name, item_type), users!orders_user_id_fkey(id, display_name, email)',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false });

  if (query.status) dbQuery = dbQuery.eq('status', query.status);

  const { data, count, error } = await dbQuery.range(offset, offset + limit - 1);
  if (error) throw error;

  return { items: data ?? [], meta: buildMeta(count ?? 0, page, limit) };
}

/**
 * Admin: marks an order as fulfilled.
 */
export async function fulfillOrder(
  orderId: string,
  adminId: string,
  fulfillmentNote: string,
): Promise<void> {
  const { data: order } = await getSupabase()
    .from('orders')
    .select('id, user_id, status, marketplace_items(name)')
    .eq('id', orderId)
    .maybeSingle();

  if (!order) throw new NotFoundError('Order not found');
  if (order.status === 'fulfilled') {
    throw new ValidationError('Order already fulfilled');
  }

  await getSupabase()
    .from('orders')
    .update({
      status: 'fulfilled',
      fulfillment_note: fulfillmentNote,
      fulfilled_by: adminId,
      fulfilled_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  const itemName =
    (order.marketplace_items as { name?: string } | null)?.name ?? 'your item';

  await notificationService.createNotification({
    userId: order.user_id,
    title: 'Order fulfilled',
    body: `Your order for "${itemName}" has been fulfilled. ${fulfillmentNote}`,
    type: 'order_update',
    referenceId: orderId,
  });

  await notificationService.maybeSendEmail(
    order.user_id,
    'order_updates',
    'Your NACOS order has been fulfilled',
    `<p>Your marketplace order has been fulfilled.</p><p>${fulfillmentNote}</p>`,
  );
}

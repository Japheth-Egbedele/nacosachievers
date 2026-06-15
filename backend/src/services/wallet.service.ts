import { getSupabase } from '../config/supabase.js';
import type { TransactionType } from '../constants/enums.js';
import { TREASURY_MATRIC } from '../constants/auth.js';
import { ValidationError } from '../utils/errors.js';
import { parsePagination, buildMeta } from '../utils/pagination.js';
import type { PaginationMeta } from '../utils/response.js';
import * as settingsService from './settings.service.js';
import { subMinutes } from 'date-fns';

/**
 * Credits a user's wallet atomically (conditional update).
 */
export async function creditUser(input: {
  userId: string;
  amount: number;
  type: TransactionType;
  remark: string;
  referenceId?: string;
  actorId?: string;
}): Promise<void> {
  if (input.amount <= 0) {
    throw new ValidationError('Amount must be positive');
  }

  const { data: user } = await getSupabase()
    .from('users')
    .select('wallet_balance')
    .eq('id', input.userId)
    .maybeSingle();

  if (!user) {
    throw new ValidationError('User not found');
  }

  const newBalance = user.wallet_balance + input.amount;

  const { error: updateError } = await getSupabase()
    .from('users')
    .update({ wallet_balance: newBalance, updated_at: new Date().toISOString() })
    .eq('id', input.userId);

  if (updateError) throw updateError;

  await getSupabase().from('wallet_transactions').insert({
    user_id: input.userId,
    type: input.type,
    amount: input.amount,
    balance_after: newBalance,
    remark: input.remark,
    reference_id: input.referenceId ?? null,
    actor_id: input.actorId ?? null,
  });
}

/**
 * Debits a user's wallet if sufficient balance.
 */
export async function debitUser(input: {
  userId: string;
  amount: number;
  type: TransactionType;
  remark: string;
  referenceId?: string;
  actorId?: string;
}): Promise<void> {
  if (input.amount <= 0) {
    throw new ValidationError('Amount must be positive');
  }

  const { data: user } = await getSupabase()
    .from('users')
    .select('wallet_balance')
    .eq('id', input.userId)
    .maybeSingle();

  if (!user || user.wallet_balance < input.amount) {
    throw new ValidationError('Insufficient balance');
  }

  const newBalance = user.wallet_balance - input.amount;

  const { data: rows, error: updateError } = await getSupabase()
    .from('users')
    .update({ wallet_balance: newBalance, updated_at: new Date().toISOString() })
    .eq('id', input.userId)
    .gte('wallet_balance', input.amount)
    .select('id');

  if (updateError) throw updateError;
  if (!rows?.length) {
    throw new ValidationError('Insufficient balance');
  }

  await getSupabase().from('wallet_transactions').insert({
    user_id: input.userId,
    type: input.type,
    amount: input.amount,
    balance_after: newBalance,
    remark: input.remark,
    reference_id: input.referenceId ?? null,
    actor_id: input.actorId ?? null,
  });
}

/**
 * Transfers credits between two members.
 */
export async function transferCredits(input: {
  senderId: string;
  receiverId: string;
  amount: number;
  remark: string;
}): Promise<void> {
  if (input.senderId === input.receiverId) {
    throw new ValidationError('Cannot transfer to yourself');
  }
  if (input.remark.length < 3) {
    throw new ValidationError('Remark must be at least 3 characters');
  }

  const maxTransfer = await settingsService.getSettingNumber('max_transfer_amount', 500);
  if (input.amount > maxTransfer) {
    throw new ValidationError(`Transfer cannot exceed ${maxTransfer} credits`);
  }

  const cooldownMinutes = await settingsService.getSettingNumber('transfer_cooldown_minutes', 5);
  const cooldownSince = subMinutes(new Date(), cooldownMinutes).toISOString();
  const { data: recentTransfer } = await getSupabase()
    .from('transfers')
    .select('id')
    .eq('sender_id', input.senderId)
    .gte('created_at', cooldownSince)
    .limit(1)
    .maybeSingle();

  if (recentTransfer) {
    throw new ValidationError(`Please wait ${cooldownMinutes} minutes between transfers`);
  }

  const { data: receiver } = await getSupabase()
    .from('users')
    .select('id, is_active')
    .eq('id', input.receiverId)
    .maybeSingle();

  if (!receiver?.is_active) {
    throw new ValidationError('Recipient not found or inactive');
  }

  const { data: senderBefore } = await getSupabase()
    .from('users')
    .select('wallet_balance')
    .eq('id', input.senderId)
    .maybeSingle();

  if (!senderBefore || senderBefore.wallet_balance < input.amount) {
    throw new ValidationError('Insufficient balance');
  }

  const senderAfter = senderBefore.wallet_balance - input.amount;

  const { data: senderRows, error: senderErr } = await getSupabase()
    .from('users')
    .update({ wallet_balance: senderAfter, updated_at: new Date().toISOString() })
    .eq('id', input.senderId)
    .gte('wallet_balance', input.amount)
    .select('wallet_balance');

  if (senderErr) throw senderErr;
  if (!senderRows?.length) {
    throw new ValidationError('Insufficient balance');
  }

  const { data: receiverBefore, error: receiverErr } = await getSupabase()
    .from('users')
    .select('wallet_balance')
    .eq('id', input.receiverId)
    .single();

  if (receiverErr || !receiverBefore) {
    throw new ValidationError('Receiver not found');
  }

  const receiverAfter = receiverBefore.wallet_balance + input.amount;

  await getSupabase()
    .from('users')
    .update({ wallet_balance: receiverAfter, updated_at: new Date().toISOString() })
    .eq('id', input.receiverId);

  const { data: outTx } = await getSupabase()
    .from('wallet_transactions')
    .insert({
      user_id: input.senderId,
      type: 'transfer_out',
      amount: input.amount,
      balance_after: senderAfter,
      remark: input.remark,
      actor_id: input.senderId,
    })
    .select('id')
    .single();

  await getSupabase().from('wallet_transactions').insert({
    user_id: input.receiverId,
    type: 'transfer_in',
    amount: input.amount,
    balance_after: receiverAfter,
    remark: input.remark,
    reference_id: outTx?.id ?? null,
    actor_id: input.senderId,
  });

  await getSupabase().from('transfers').insert({
    sender_id: input.senderId,
    receiver_id: input.receiverId,
    amount: input.amount,
    remark: input.remark,
    sender_tx_id: outTx?.id ?? null,
  });
}

/**
 * Returns wallet balance for a user.
 */
export async function getBalance(userId: string): Promise<{ balance: number }> {
  const { data: user } = await getSupabase()
    .from('users')
    .select('wallet_balance')
    .eq('id', userId)
    .maybeSingle();

  if (!user) {
    throw new ValidationError('User not found');
  }

  return { balance: user.wallet_balance };
}

export interface WalletTransactionRow {
  id: string;
  type: TransactionType;
  amount: number;
  balance_after: number;
  remark: string;
  reference_id: string | null;
  actor_id: string | null;
  created_at: string;
}

/**
 * Lists wallet transactions for a user.
 */
export async function listUserTransactions(
  userId: string,
  query: { page?: unknown; limit?: unknown; type?: string },
): Promise<{ items: WalletTransactionRow[]; meta: PaginationMeta }> {
  const { page, limit, offset } = parsePagination(query);

  let dbQuery = getSupabase()
    .from('wallet_transactions')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (query.type) {
    dbQuery = dbQuery.eq('type', query.type);
  }

  const { data, count, error } = await dbQuery.range(offset, offset + limit - 1);
  if (error) throw error;

  return {
    items: (data ?? []) as WalletTransactionRow[],
    meta: buildMeta(count ?? 0, page, limit),
  };
}

/**
 * Admin: lists all wallet transactions with optional filters.
 */
export async function listAdminTransactions(query: {
  page?: unknown;
  limit?: unknown;
  user_id?: string;
  type?: string;
  from?: string;
  to?: string;
}): Promise<{ items: WalletTransactionRow[]; meta: PaginationMeta }> {
  const { page, limit, offset } = parsePagination(query);

  let dbQuery = getSupabase()
    .from('wallet_transactions')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (query.user_id) dbQuery = dbQuery.eq('user_id', query.user_id);
  if (query.type) dbQuery = dbQuery.eq('type', query.type);
  if (query.from) dbQuery = dbQuery.gte('created_at', query.from);
  if (query.to) dbQuery = dbQuery.lte('created_at', query.to);

  const { data, count, error } = await dbQuery.range(offset, offset + limit - 1);
  if (error) throw error;

  return {
    items: (data ?? []) as WalletTransactionRow[],
    meta: buildMeta(count ?? 0, page, limit),
  };
}

/**
 * Admin: credits one or more users.
 */
export async function bulkCredit(input: {
  actorId: string;
  remark: string;
  credits: { user_id: string; amount: number }[];
}): Promise<{ credited: number }> {
  if (input.remark.length < 3) {
    throw new ValidationError('Remark must be at least 3 characters');
  }
  if (!input.credits.length) {
    throw new ValidationError('At least one credit entry required');
  }

  for (const entry of input.credits) {
    await creditUser({
      userId: entry.user_id,
      amount: entry.amount,
      type: 'credit',
      remark: input.remark,
      actorId: input.actorId,
    });
  }

  return { credited: input.credits.length };
}

let treasuryUserIdCache: string | null = null;

/**
 * Resolves the chapter treasury system user id.
 */
export async function getTreasuryUserId(): Promise<string> {
  if (treasuryUserIdCache) return treasuryUserIdCache;
  const { data } = await getSupabase()
    .from('users')
    .select('id')
    .eq('matric_number', TREASURY_MATRIC)
    .maybeSingle();
  if (!data?.id) {
    throw new ValidationError('Chapter treasury account not configured. Run MANUAL_SETUP §2.9.1.');
  }
  treasuryUserIdCache = data.id;
  return data.id;
}

/**
 * Treasury balance and default vault reward for admin dashboard.
 */
export async function getTreasurySummary(): Promise<{
  balance: number;
  default_vault_reward: number;
  total_issued_upload_rewards: number;
}> {
  const treasuryId = await getTreasuryUserId();
  const { data: user } = await getSupabase()
    .from('users')
    .select('wallet_balance')
    .eq('id', treasuryId)
    .single();

  const defaultReward = await settingsService.getSettingNumber('vault_upload_credit_reward', 10);

  const { data: issued } = await getSupabase()
    .from('wallet_transactions')
    .select('amount')
    .eq('type', 'upload_reward');

  const totalIssued = (issued ?? []).reduce((sum, row) => sum + row.amount, 0);

  return {
    balance: user?.wallet_balance ?? 0,
    default_vault_reward: defaultReward,
    total_issued_upload_rewards: totalIssued,
  };
}

/**
 * Super admin funds the chapter treasury (off-platform budget approval).
 */
export async function fundTreasury(input: {
  actorId: string;
  amount: number;
  remark: string;
}): Promise<{ balance: number }> {
  if (input.remark.length < 3) {
    throw new ValidationError('Remark must be at least 3 characters');
  }
  const treasuryId = await getTreasuryUserId();
  await creditUser({
    userId: treasuryId,
    amount: input.amount,
    type: 'credit',
    remark: input.remark,
    actorId: input.actorId,
  });
  const { balance } = await getBalance(treasuryId);
  return { balance };
}

/**
 * Pays upload reward from treasury to member (atomic pair of ledger entries).
 */
export async function treasuryPayout(input: {
  memberId: string;
  amount: number;
  remark: string;
  referenceId: string;
  actorId: string;
}): Promise<void> {
  if (input.amount <= 0) return;

  const treasuryId = await getTreasuryUserId();
  const { data: treasury } = await getSupabase()
    .from('users')
    .select('wallet_balance')
    .eq('id', treasuryId)
    .maybeSingle();

  if (!treasury || treasury.wallet_balance < input.amount) {
    throw new ValidationError(
      'Insufficient treasury balance. Fund treasury in Admin → Wallet before approving with credits.',
    );
  }

  await debitUser({
    userId: treasuryId,
    amount: input.amount,
    type: 'transfer_out',
    remark: `Treasury payout: ${input.remark}`,
    referenceId: input.referenceId,
    actorId: input.actorId,
  });

  await creditUser({
    userId: input.memberId,
    amount: input.amount,
    type: 'upload_reward',
    remark: input.remark,
    referenceId: input.referenceId,
    actorId: input.actorId,
  });
}

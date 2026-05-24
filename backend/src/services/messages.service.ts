import { getSupabase } from '../config/supabase.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/errors.js';
import { parsePagination, buildMeta } from '../utils/pagination.js';
import type { PaginationMeta } from '../utils/response.js';
import * as notificationService from './notification.service.js';

/**
 * Lists conversations for a user sorted by latest message.
 */
export async function listConversations(userId: string): Promise<unknown[]> {
  const { data: participations, error } = await getSupabase()
    .from('conversation_participants')
    .select('conversation_id, last_read_at')
    .eq('user_id', userId);

  if (error) throw error;
  if (!participations?.length) return [];

  const conversationIds = participations.map((p) => p.conversation_id);

  const { data: conversations, error: convError } = await getSupabase()
    .from('conversations')
    .select('id, created_at')
    .in('id', conversationIds);

  if (convError) throw convError;

  const results: unknown[] = [];

  for (const conv of conversations ?? []) {
    const { data: messages } = await getSupabase()
      .from('messages')
      .select('id, content, sender_id, created_at, is_deleted')
      .eq('conversation_id', conv.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(1);

    const lastMessage = messages?.[0] ?? null;

    const { data: participants } = await getSupabase()
      .from('conversation_participants')
      .select('user_id, users!conversation_participants_user_id_fkey(id, display_name, profile_photo_url)')
      .eq('conversation_id', conv.id);

    const otherParticipant = (participants ?? []).find(
      (p) => (p as { user_id: string }).user_id !== userId,
    );

    const myParticipation = participations.find((p) => p.conversation_id === conv.id);
    const unread =
      lastMessage &&
      lastMessage.sender_id !== userId &&
      (!myParticipation?.last_read_at ||
        new Date(lastMessage.created_at) > new Date(myParticipation.last_read_at));

    results.push({
      id: conv.id,
      created_at: conv.created_at,
      last_message: lastMessage,
      other_user: (otherParticipant as { users?: unknown })?.users ?? null,
      has_unread: !!unread,
    });
  }

  results.sort((a, b) => {
    const aTime = (a as { last_message?: { created_at: string } }).last_message?.created_at;
    const bTime = (b as { last_message?: { created_at: string } }).last_message?.created_at;
    if (!aTime && !bTime) return 0;
    if (!aTime) return 1;
    if (!bTime) return -1;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  return results;
}

/**
 * Finds or creates a 1:1 conversation with another user.
 */
export async function getOrCreateConversation(
  userId: string,
  otherUserId: string,
): Promise<{ conversation_id: string }> {
  if (userId === otherUserId) {
    throw new ValidationError('Cannot message yourself');
  }

  const { data: other } = await getSupabase()
    .from('users')
    .select('id, is_active')
    .eq('id', otherUserId)
    .maybeSingle();

  if (!other?.is_active) {
    throw new NotFoundError('User not found');
  }

  const { data: myConvs } = await getSupabase()
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', userId);

  for (const row of myConvs ?? []) {
    const { data: participants } = await getSupabase()
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', row.conversation_id);

    const userIds = (participants ?? []).map((p) => p.user_id);
    if (userIds.length === 2 && userIds.includes(otherUserId)) {
      return { conversation_id: row.conversation_id };
    }
  }

  const { data: conversation, error: convError } = await getSupabase()
    .from('conversations')
    .insert({})
    .select('id')
    .single();

  if (convError) throw convError;

  await getSupabase().from('conversation_participants').insert([
    { conversation_id: conversation.id, user_id: userId },
    { conversation_id: conversation.id, user_id: otherUserId },
  ]);

  return { conversation_id: conversation.id };
}

/**
 * Returns conversation messages (paginated).
 */
export async function getConversation(
  userId: string,
  conversationId: string,
  query: { page?: unknown; limit?: unknown },
): Promise<{ items: unknown[]; meta: PaginationMeta; conversation: unknown }> {
  await assertParticipant(userId, conversationId);

  const { page, limit, offset } = parsePagination(query);

  const { data: messages, count, error } = await getSupabase()
    .from('messages')
    .select('*', { count: 'exact' })
    .eq('conversation_id', conversationId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  await getSupabase()
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);

  const { data: conversation } = await getSupabase()
    .from('conversations')
    .select('id, created_at')
    .eq('id', conversationId)
    .single();

  return {
    conversation,
    items: messages ?? [],
    meta: buildMeta(count ?? 0, page, limit),
  };
}

/**
 * Sends a message in a conversation.
 */
export async function sendMessage(
  userId: string,
  conversationId: string,
  content: string,
): Promise<unknown> {
  await assertParticipant(userId, conversationId);

  if (!content.trim()) {
    throw new ValidationError('Message cannot be empty');
  }

  const { data: message, error } = await getSupabase()
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: userId,
      content: content.trim(),
    })
    .select('*')
    .single();

  if (error) throw error;

  const { data: participants } = await getSupabase()
    .from('conversation_participants')
    .select('user_id')
    .eq('conversation_id', conversationId);

  for (const p of participants ?? []) {
    if (p.user_id !== userId) {
      await notificationService.createNotification({
        userId: p.user_id,
        title: 'New message',
        body: content.trim().slice(0, 120),
        type: 'message',
        referenceId: conversationId,
      });
    }
  }

  return message;
}

/**
 * Soft-deletes own message.
 */
export async function deleteMessage(userId: string, messageId: string): Promise<void> {
  const { data: message } = await getSupabase()
    .from('messages')
    .select('sender_id')
    .eq('id', messageId)
    .maybeSingle();

  if (!message) throw new NotFoundError('Message not found');
  if (message.sender_id !== userId) {
    throw new ForbiddenError('Cannot delete this message');
  }

  await getSupabase().from('messages').update({ is_deleted: true }).eq('id', messageId);
}

async function assertParticipant(userId: string, conversationId: string): Promise<void> {
  const { data } = await getSupabase()
    .from('conversation_participants')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) throw new ForbiddenError('Not a participant in this conversation');
}

'use client';

import { useEffect, useState } from 'react';
import HubPageHeader from '@/app/hub/components/ui/HubPageHeader';
import HubAlert from '@/app/hub/components/ui/HubAlert';
import { apiFetch, ApiClientError } from '@/lib/api';

interface ConversationRow {
  id: string;
  other_user?: { display_name?: string; matric_number?: string };
  last_message?: { content?: string; created_at?: string };
  unread_count?: number;
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<ConversationRow[]>('/messages/conversations')
      .then(setConversations)
      .catch((err) => {
        setError(err instanceof ApiClientError ? err.message : 'Failed to load messages');
        setConversations([]);
      });
  }, []);

  return (
    <div>
      <HubPageHeader
        title="Messages"
        description="Direct messages between members. Full chat UI coming soon."
      />
      {error && <HubAlert variant="error" className="mb-4">{error}</HubAlert>}
      <ul className="space-y-2">
        {conversations.map((c) => (
          <li key={c.id} className="rounded-xl border border-[var(--color-hub-border)] px-4 py-3">
            <p className="font-medium">
              {c.other_user?.display_name ?? c.other_user?.matric_number ?? 'Member'}
            </p>
            {c.last_message?.content && (
              <p className="mt-1 truncate text-sm text-zinc-600">{c.last_message.content}</p>
            )}
            <p className="mt-2 text-xs text-zinc-500">
              {c.last_message?.created_at
                ? new Date(c.last_message.created_at).toLocaleString()
                : 'No messages yet'}
              {c.unread_count ? ` · ${c.unread_count} unread` : ''}
            </p>
          </li>
        ))}
        {conversations.length === 0 && !error && (
          <p className="text-sm text-zinc-500">
            No conversations yet. Start one from a member profile when messaging is expanded.
          </p>
        )}
      </ul>
      <p className="mt-6 text-xs text-zinc-500">
        API endpoints are live at <code className="font-mono">/messages/conversations</code>.
      </p>
    </div>
  );
}

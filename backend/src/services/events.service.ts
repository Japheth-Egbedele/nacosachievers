import { v4 as uuidv4 } from 'uuid';
import { getSupabase } from '../config/supabase.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { parsePagination, buildMeta } from '../utils/pagination.js';
import type { PaginationMeta } from '../utils/response.js';
import * as storageService from './storage.service.js';
import * as notificationService from './notification.service.js';

export interface EventRow {
  id: string;
  title: string;
  description: string | null;
  start_datetime: string;
  end_datetime: string | null;
  location: string | null;
  is_online: boolean;
  meeting_link: string | null;
  banner_image_url: string | null;
  rsvp_limit: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}

/**
 * Lists published events.
 */
export async function listEvents(query: {
  page?: unknown;
  limit?: unknown;
  filter?: string;
}): Promise<{ items: EventRow[]; meta: PaginationMeta }> {
  const { page, limit, offset } = parsePagination(query);
  const now = new Date().toISOString();

  let dbQuery = getSupabase()
    .from('events')
    .select('*', { count: 'exact' })
    .eq('status', 'published')
    .order('start_datetime', { ascending: query.filter !== 'past' });

  if (query.filter === 'upcoming') {
    dbQuery = dbQuery.gte('start_datetime', now);
  } else if (query.filter === 'past') {
    dbQuery = dbQuery.lt('start_datetime', now);
  }

  const { data, count, error } = await dbQuery.range(offset, offset + limit - 1);
  if (error) throw error;

  return {
    items: (data ?? []) as EventRow[],
    meta: buildMeta(count ?? 0, page, limit),
  };
}

/**
 * Returns event detail with RSVP count.
 */
export async function getEvent(id: string, userId?: string): Promise<Record<string, unknown>> {
  const { data: event, error } = await getSupabase()
    .from('events')
    .select('*')
    .eq('id', id)
    .eq('status', 'published')
    .maybeSingle();

  if (error) throw error;
  if (!event) throw new NotFoundError('Event not found');

  const { count: rsvpCount } = await getSupabase()
    .from('event_rsvps')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', id);

  let userRsvped = false;
  if (userId) {
    const { data: rsvp } = await getSupabase()
      .from('event_rsvps')
      .select('id')
      .eq('event_id', id)
      .eq('user_id', userId)
      .maybeSingle();
    userRsvped = !!rsvp;
  }

  return {
    ...event,
    rsvp_count: rsvpCount ?? 0,
    user_rsvped: userRsvped,
  };
}

/**
 * Creates RSVP for an event.
 */
export async function createRsvp(eventId: string, userId: string): Promise<void> {
  const { data: event } = await getSupabase()
    .from('events')
    .select('id, title, rsvp_limit, status')
    .eq('id', eventId)
    .eq('status', 'published')
    .maybeSingle();

  if (!event) throw new NotFoundError('Event not found');

  const { data: existing } = await getSupabase()
    .from('event_rsvps')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    throw new ValidationError('Already RSVPed to this event');
  }

  if (event.rsvp_limit !== null) {
    const { count } = await getSupabase()
      .from('event_rsvps')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId);

    if ((count ?? 0) >= event.rsvp_limit) {
      throw new ValidationError('RSVP limit reached');
    }
  }

  const { error } = await getSupabase().from('event_rsvps').insert({
    event_id: eventId,
    user_id: userId,
  });

  if (error) {
    if (error.code === '23505') {
      throw new ValidationError('Already RSVPed to this event');
    }
    throw error;
  }

  if (event.rsvp_limit !== null) {
    const { count: afterCount } = await getSupabase()
      .from('event_rsvps')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId);

    if ((afterCount ?? 0) >= event.rsvp_limit) {
      const { data: admins } = await getSupabase()
        .from('users')
        .select('id')
        .in('role', ['executive', 'super_admin'])
        .eq('is_active', true);

      for (const admin of admins ?? []) {
        await notificationService.createNotification({
          userId: admin.id,
          title: 'Event RSVP cap reached',
          body: `RSVP limit reached for "${event.title}".`,
          type: 'event_reminder',
          referenceId: eventId,
        });
      }
    }
  }
}

/**
 * Cancels RSVP for an event.
 */
export async function cancelRsvp(eventId: string, userId: string): Promise<void> {
  const { data } = await getSupabase()
    .from('event_rsvps')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .select('id');

  if (!data?.length) throw new NotFoundError('RSVP not found');
}

/**
 * Admin: creates an event.
 */
export async function createEvent(
  input: Record<string, unknown>,
  createdBy: string,
  bannerFile?: Express.Multer.File,
): Promise<EventRow> {
  let bannerUrl: string | null = null;
  if (bannerFile) {
    const ext = bannerFile.mimetype.split('/')[1] ?? 'jpg';
    const path = `events/${uuidv4()}.${ext}`;
    bannerUrl = await storageService.uploadFile(
      'public-images',
      path,
      bannerFile.buffer,
      bannerFile.mimetype,
    );
  }

  const { data, error } = await getSupabase()
    .from('events')
    .insert({
      ...input,
      banner_image_url: bannerUrl,
      created_by: createdBy,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as EventRow;
}

/**
 * Admin: updates an event.
 */
export async function updateEvent(
  id: string,
  updates: Record<string, unknown>,
  bannerFile?: Express.Multer.File,
): Promise<EventRow> {
  const { data: existing } = await getSupabase()
    .from('events')
    .select('banner_image_url')
    .eq('id', id)
    .maybeSingle();

  if (!existing) throw new NotFoundError('Event not found');

  const patch: Record<string, unknown> = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  if (bannerFile) {
    const ext = bannerFile.mimetype.split('/')[1] ?? 'jpg';
    const path = `events/${uuidv4()}.${ext}`;
    patch.banner_image_url = await storageService.uploadFile(
      'public-images',
      path,
      bannerFile.buffer,
      bannerFile.mimetype,
    );
    if (existing.banner_image_url) {
      const oldPath = storageService.extractPathFromUrl(
        existing.banner_image_url,
        'public-images',
      );
      await storageService.deleteFile('public-images', oldPath).catch(() => undefined);
    }
  }

  const { data, error } = await getSupabase()
    .from('events')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data as EventRow;
}

/**
 * Admin: deletes an event (cascades RSVPs).
 */
export async function deleteEvent(id: string): Promise<void> {
  const { error } = await getSupabase().from('events').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Admin: lists RSVPs for an event.
 */
export async function listEventRsvps(eventId: string): Promise<unknown[]> {
  const { data: event } = await getSupabase()
    .from('events')
    .select('id')
    .eq('id', eventId)
    .maybeSingle();

  if (!event) throw new NotFoundError('Event not found');

  const { data, error } = await getSupabase()
    .from('event_rsvps')
    .select(
      'id, created_at, users!event_rsvps_user_id_fkey(id, display_name, email, matric_number, level)',
    )
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Admin: exports RSVPs as CSV string.
 */
export async function exportEventRsvpsCsv(eventId: string): Promise<string> {
  const rsvps = await listEventRsvps(eventId);
  const header = 'display_name,email,matric_number,level,rsvp_at';
  const rows = rsvps.map((row) => {
    const r = row as {
      created_at: string;
      users: {
        display_name: string;
        email: string;
        matric_number: string;
        level: string;
      };
    };
    const u = r.users;
    const escape = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`;
    return [
      escape(u.display_name),
      escape(u.email),
      escape(u.matric_number),
      escape(u.level ?? ''),
      escape(r.created_at),
    ].join(',');
  });
  return [header, ...rows].join('\n');
}

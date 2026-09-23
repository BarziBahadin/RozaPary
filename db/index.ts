import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { demoEvent, type Invitation } from '@/lib/event';
import type { parseRsvp } from '@/lib/validation';

type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];
type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
    Functions: {
      roza_get_event: { Args: { p_slug: string }; Returns: Json };
      roza_dashboard: { Args: { p_slug: string }; Returns: Json };
      roza_create_event: { Args: { p_event: Json }; Returns: Json };
      roza_update_event: { Args: { p_event: Json }; Returns: Json };
      roza_save_rsvp: {
        Args: { p_response: Json; p_guest_token: string };
        Returns: undefined;
      };
      roza_record_open: {
        Args: { p_slug: string; p_guest_token: string };
        Returns: undefined;
      };
      roza_consume_rate_limit: { Args: { p_key: string }; Returns: number };
    };
  };
};
export class DatabaseError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export function isDatabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}
function database() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key)
    throw new DatabaseError(
      'NOT_CONFIGURED',
      'Connect Supabase by setting SUPABASE_URL and SUPABASE_SECRET_KEY, then run the migration.',
    );
  return createClient<Database>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
    },
  });
}
function check(error: { code: string; message: string } | null) {
  if (error) throw new DatabaseError(error.code, error.message);
}
export async function getEvent(slug: string): Promise<Invitation | null> {
  // Without credentials only the bundled sample is viewable. No writes pretend to succeed.
  if (!isDatabaseConfigured())
    return slug === demoEvent.slug ? demoEvent : null;
  const { data, error } = await database().rpc('roza_get_event', {
    p_slug: slug,
  });
  check(error);
  return data as unknown as Invitation | null;
}
export async function getDashboard(slug: string) {
  const { data, error } = await database().rpc('roza_dashboard', {
    p_slug: slug,
  });
  check(error);
  return data;
}
export async function createEvent(event: Invitation) {
  const { error } = await database().rpc('roza_create_event', {
    p_event: event as unknown as Json,
  });
  check(error);
}
export async function updateEvent(event: Invitation) {
  const { data, error } = await database().rpc('roza_update_event', {
    p_event: event as unknown as Json,
  });
  check(error);
  return Boolean(data);
}
export async function saveRsvp(
  input: ReturnType<typeof parseRsvp>,
  guestToken: string,
) {
  const { error } = await database().rpc('roza_save_rsvp', {
    p_response: input,
    p_guest_token: guestToken,
  });
  check(error);
}
export async function recordOpen(slug: string, guestToken: string) {
  const { error } = await database().rpc('roza_record_open', {
    p_slug: slug,
    p_guest_token: guestToken,
  });
  check(error);
}
export async function consumeRateLimit(key: string) {
  const { data, error } = await database().rpc('roza_consume_rate_limit', {
    p_key: key,
  });
  check(error);
  if (typeof data !== 'number')
    throw new DatabaseError('INVALID_RESPONSE', 'Invalid rate-limit response.');
  return data;
}

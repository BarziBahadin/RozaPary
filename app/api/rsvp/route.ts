import { database, getEvent } from '@/db';
import { parseRsvp } from '@/lib/validation';
import {
  body,
  checkOrigin,
  cookieHeader,
  guest,
  handle,
  hash,
  HttpError,
  json,
  limit,
} from '@/lib/server';
export async function POST(request: Request) {
  return handle(async () => {
    checkOrigin(request);
    await limit(request, 'rsvp', 12);
    const input = parseRsvp(await body(request));
    const event = await getEvent(input.eventSlug);
    if (!event) throw new HttpError('This invitation could not be found.', 404);
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: event.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    if (today > event.replyBy)
      throw new HttpError(
        'The RSVP deadline has passed. Please contact your host.',
        410,
      );
    const token = guest(request);
    const digest = await hash(token);
    const now = new Date().toISOString();
    const db = await database();
    await db
      .prepare(
        'INSERT INTO responses (id,event_slug,guest_token,name,attendance,plus_ones,dietary,message,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(event_slug,guest_token) DO UPDATE SET name=excluded.name,attendance=excluded.attendance,plus_ones=excluded.plus_ones,dietary=excluded.dietary,message=excluded.message,updated_at=excluded.updated_at',
      )
      .bind(
        crypto.randomUUID(),
        input.eventSlug,
        digest,
        input.name,
        input.attendance,
        input.plusOnes,
        input.dietary,
        input.message,
        now,
        now,
      )
      .run();
    return json({ success: true, attendance: input.attendance }, 200, {
      'Set-Cookie': cookieHeader(request, 'roza_guest', token, 365 * 86400),
    });
  });
}

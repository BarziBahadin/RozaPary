import { database, getEvent } from '@/db';
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
    await limit(request, 'opens', 60);
    const input = await body(request);
    if (
      !input ||
      typeof input.eventSlug !== 'string' ||
      input.eventSlug.length > 80 ||
      !(await getEvent(input.eventSlug))
    )
      throw new HttpError('Invitation not found.', 404);
    const token = guest(request);
    const db = await database();
    await db
      .prepare(
        'INSERT OR IGNORE INTO opens (event_slug,guest_token,opened_at) VALUES (?,?,?)',
      )
      .bind(input.eventSlug, await hash(token), new Date().toISOString())
      .run();
    return json({ success: true }, 200, {
      'Set-Cookie': cookieHeader(request, 'roza_guest', token, 365 * 86400),
    });
  });
}

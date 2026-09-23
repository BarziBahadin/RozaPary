import { recordOpen, getEvent } from '@/db';
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
    await recordOpen(input.eventSlug, await hash(token));
    return json({ success: true }, 200, {
      'Set-Cookie': cookieHeader(request, 'roza_guest', token, 365 * 86400),
    });
  });
}

import { database } from '@/db';
import { parseEvent } from '@/lib/validation';
import {
  body,
  checkOrigin,
  handle,
  HttpError,
  json,
  requireAdmin,
} from '@/lib/server';
export async function POST(request: Request) {
  return handle(async () => {
    checkOrigin(request);
    await requireAdmin(request);
    const event = parseEvent(await body(request));
    const db = await database();
    const result = await db
      .prepare(
        'INSERT OR IGNORE INTO events (slug,data,created_at) VALUES (?,?,?)',
      )
      .bind(event.slug, JSON.stringify(event), new Date().toISOString())
      .run();
    if (!result.meta.changes)
      throw new HttpError(
        'That invitation link is already in use. Please choose another.',
        409,
      );
    return json({ event }, 201);
  });
}
export async function PUT(request: Request) {
  return handle(async () => {
    checkOrigin(request);
    await requireAdmin(request);
    const event = parseEvent(await body(request));
    const db = await database();
    const result = await db
      .prepare('UPDATE events SET data=? WHERE slug=?')
      .bind(JSON.stringify(event), event.slug)
      .run();
    if (!result.meta.changes) throw new HttpError('Invitation not found.', 404);
    return json({ event });
  });
}

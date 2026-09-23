import { createEvent, updateEvent } from '@/db';
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
    await createEvent(event);
    return json({ event }, 201);
  });
}
export async function PUT(request: Request) {
  return handle(async () => {
    checkOrigin(request);
    await requireAdmin(request);
    const event = parseEvent(await body(request));
    if (!(await updateEvent(event)))
      throw new HttpError('Invitation not found.', 404);
    return json({ event });
  });
}

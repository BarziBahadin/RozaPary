import {
  body,
  checkOrigin,
  cookieHeader,
  handle,
  HttpError,
  json,
  limit,
  passwordMatches,
  sessionToken,
} from '@/lib/server';
export async function POST(request: Request) {
  return handle(async () => {
    checkOrigin(request);
    await limit(request, 'login', 5);
    const input = await body(request);
    if (!(await passwordMatches(input?.password)))
      throw new HttpError(
        'That password doesn’t match. Please try again.',
        401,
      );
    return json({ success: true }, 200, {
      'Set-Cookie': cookieHeader(
        request,
        'roza_host',
        await sessionToken(),
        8 * 3600,
      ),
    });
  });
}

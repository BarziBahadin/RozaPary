import { checkOrigin, cookieHeader, handle, json } from '@/lib/server';
export async function POST(request: Request) {
  return handle(async () => {
    checkOrigin(request);
    return json({ success: true }, 200, {
      'Set-Cookie': cookieHeader(request, 'roza_host', '', 0),
    });
  });
}

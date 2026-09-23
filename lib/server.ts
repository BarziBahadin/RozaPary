import 'server-only';
import { consumeRateLimit, DatabaseError } from '@/db';
import { ValidationError } from '@/lib/validation';
const encoder = new TextEncoder();
export class HttpError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export const json = (body: unknown, status = 200, headers?: HeadersInit) => {
  const responseHeaders = new Headers(headers);
  responseHeaders.set('Cache-Control', 'no-store');
  return Response.json(body, { status, headers: responseHeaders });
};
export function cookie(request: Request, name: string) {
  return request.headers
    .get('cookie')
    ?.split(';')
    .map((x) => x.trim())
    .find((x) => x.startsWith(name + '='))
    ?.slice(name.length + 1);
}
export function cookieHeader(
  request: Request,
  name: string,
  value: string,
  maxAge: number,
) {
  return `${name}=${value}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`;
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin)
    throw new HttpError('Request origin is not allowed.', 403);
}
export async function body(request: Request) {
  if (!request.headers.get('content-type')?.includes('application/json'))
    throw new HttpError('Use a JSON request.', 415);
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError('Missing request body.');
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 16384) {
      await reader.cancel();
      throw new HttpError('Request is too large.', 413);
    }
    chunks.push(value);
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(result));
  } catch {
    throw new HttpError('Invalid JSON.');
  }
}
export async function hash(value: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', encoder.encode(value)),
    ),
  )
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('');
}
export async function limit(
  request: Request,
  category: string,
  maximum: number,
) {
  const bucket = Math.floor(Date.now() / 60000);
  // Trust Vercel’s overwritten IP header only when running on Vercel.
  const ip =
    process.env.VERCEL === '1'
      ? (request.headers.get('x-vercel-forwarded-for') ??
        request.headers.get('x-forwarded-for') ??
        'unknown')
      : 'local';
  const key = await hash(`${category}:${ip}:${bucket}`);
  const hits = await consumeRateLimit(key);
  if (hits > maximum)
    throw new HttpError(
      'Too many requests. Please try again in a minute.',
      429,
    );
}
export function guest(request: Request) {
  const existing = cookie(request, 'roza_guest');
  return existing && /^[a-f0-9]{64}$/.test(existing)
    ? existing
    : Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map((x) => x.toString(16).padStart(2, '0'))
        .join('');
}
function adminSecret() {
  const value = process.env.ADMIN_PASSWORD;
  if (!value || value.length < 16)
    throw new HttpError(
      'The host password has not been configured. Set ADMIN_PASSWORD to at least 16 characters.',
      503,
    );
  return value;
}
async function key() {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(adminSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}
export async function passwordMatches(password: unknown) {
  if (typeof password !== 'string' || password.length > 256) return false;
  const signature = await crypto.subtle.sign(
    'HMAC',
    await key(),
    encoder.encode(password),
  );
  return crypto.subtle.verify(
    'HMAC',
    await key(),
    signature,
    encoder.encode(adminSecret()),
  );
}
export async function sessionToken() {
  const payload = `${Date.now() + 8 * 3600000}.${crypto.randomUUID()}`;
  const signature = await crypto.subtle.sign(
    'HMAC',
    await key(),
    encoder.encode(payload),
  );
  return `${payload}.${Array.from(new Uint8Array(signature))
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('')}`;
}
export async function requireAdmin(request: Request) {
  const token = cookie(request, 'roza_host');
  if (!token) throw new HttpError('Please sign in to your host studio.', 401);
  const [expiry, nonce, signature] = token.split('.');
  if (
    !expiry ||
    !nonce ||
    !signature ||
    !/^\d{13}$/.test(expiry) ||
    Number(expiry) <= Date.now() ||
    !/^[a-f0-9]{64}$/.test(signature)
  )
    throw new HttpError('Your session has expired. Please sign in again.', 401);
  const valid = await crypto.subtle.verify(
    'HMAC',
    await key(),
    Uint8Array.from(signature.match(/../g)!, (x) => parseInt(x, 16)),
    encoder.encode(`${expiry}.${nonce}`),
  );
  if (!valid) throw new HttpError('Please sign in again.', 401);
}
export async function handle(action: () => Promise<Response>) {
  try {
    return await action();
  } catch (error) {
    if (error instanceof DatabaseError) {
      if (error.code === 'NOT_CONFIGURED')
        return json({ error: error.message }, 503);
      if (error.code === '23505')
        return json(
          {
            error:
              'That invitation link is already in use. Please choose another.',
          },
          409,
        );
      if (error.code === 'P0001')
        return json(
          { error: 'The RSVP deadline has passed. Please contact your host.' },
          410,
        );
      if (error.code === 'PGRST202' || error.code === '42P01')
        return json(
          {
            error:
              'The Supabase database needs setup. Run the SQL migration in supabase/migrations.',
          },
          503,
        );
    }
    if (error instanceof ValidationError)
      return json({ error: error.message }, 400);
    if (error instanceof HttpError)
      return json({ error: error.message }, error.status);
    console.error(
      'Request failed',
      error instanceof Error ? error.message : 'Unknown error',
    );
    return json(
      { error: 'We could not save your request. Please try again.' },
      500,
    );
  }
}

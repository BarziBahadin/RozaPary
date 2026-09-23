import { getDashboard } from '@/db';
import { handle, json, requireAdmin } from '@/lib/server';
export async function GET(request: Request) {
  return handle(async () => {
    await requireAdmin(request);
    const slug =
      new URL(request.url).searchParams.get('event') ?? 'adele-and-oliver';
    return json(await getDashboard(slug));
  });
}

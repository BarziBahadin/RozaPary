import { database } from '@/db';
import { handle, json, requireAdmin } from '@/lib/server';
export async function GET(request: Request) {
  return handle(async () => {
    await requireAdmin(request);
    const db = await database();
    const slug =
      new URL(request.url).searchParams.get('event') ?? 'adele-and-oliver';
    const results = await db.batch<Record<string, unknown>>([
      db.prepare('SELECT data FROM events ORDER BY created_at DESC'),
      db
        .prepare('SELECT COUNT(*) AS total FROM opens WHERE event_slug=?')
        .bind(slug),
      db
        .prepare(
          "SELECT COUNT(*) AS responses, COALESCE(SUM(CASE WHEN attendance='attending' THEN 1+plus_ones ELSE 0 END),0) AS attending, COALESCE(SUM(CASE WHEN attendance='declined' THEN 1 ELSE 0 END),0) AS declined FROM responses WHERE event_slug=?",
        )
        .bind(slug),
      db
        .prepare(
          'SELECT id,name,attendance,plus_ones,dietary,message,created_at,updated_at FROM responses WHERE event_slug=? ORDER BY updated_at DESC LIMIT 1000',
        )
        .bind(slug),
    ]);
    return json({
      events: results[0].results.map((row) => JSON.parse(String(row.data))),
      opens: results[1].results[0]?.total ?? 0,
      metrics: results[2].results[0],
      guests: results[3].results,
      updatedAt: new Date().toISOString(),
    });
  });
}

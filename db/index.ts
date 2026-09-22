import { env } from 'cloudflare:workers';
import { demoEvent, type Invitation } from '@/lib/event';
let initialization: Promise<void> | undefined;
export async function database() {
  const db = env.DB;
  if (!db) throw new Error('Database binding unavailable');
  // The same schema is shipped as migrations; this bootstrap also makes local dev zero-setup.
  initialization ??= (async () => {
    await db.batch([
      db.prepare(
        'CREATE TABLE IF NOT EXISTS events (slug TEXT PRIMARY KEY NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL)',
      ),
      db.prepare(
        "CREATE TABLE IF NOT EXISTS responses (id TEXT PRIMARY KEY NOT NULL, event_slug TEXT NOT NULL REFERENCES events(slug), guest_token TEXT NOT NULL, name TEXT NOT NULL, attendance TEXT NOT NULL, plus_ones INTEGER NOT NULL DEFAULT 0, dietary TEXT NOT NULL DEFAULT '', message TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
      ),
      db.prepare(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_responses_guest ON responses(event_slug, guest_token)',
      ),
      db.prepare(
        'CREATE INDEX IF NOT EXISTS idx_responses_event ON responses(event_slug)',
      ),
      db.prepare(
        'CREATE TABLE IF NOT EXISTS opens (event_slug TEXT NOT NULL REFERENCES events(slug), guest_token TEXT NOT NULL, opened_at TEXT NOT NULL, PRIMARY KEY (event_slug, guest_token))',
      ),
      db.prepare(
        'CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY NOT NULL, hits INTEGER NOT NULL, expires_at INTEGER NOT NULL)',
      ),
      db
        .prepare(
          'INSERT OR IGNORE INTO events (slug, data, created_at) VALUES (?, ?, ?)',
        )
        .bind(
          demoEvent.slug,
          JSON.stringify(demoEvent),
          new Date().toISOString(),
        ),
    ]);
  })().catch((error) => {
    initialization = undefined;
    throw error;
  });
  await initialization;
  return db;
}
export async function getEvent(slug: string): Promise<Invitation | null> {
  const db = await database();
  const row = await db
    .prepare('SELECT data FROM events WHERE slug = ?')
    .bind(slug)
    .first<{ data: string }>();
  return row ? JSON.parse(row.data) : null;
}

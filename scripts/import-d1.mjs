// Usage: node --env-file=.env scripts/import-d1.mjs backup.private.json
import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
if (!process.argv[2]?.endsWith('.private.json'))
  throw new Error('Pass the .private.json export created by export-d1.py.');
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY)
  throw new Error('Configure Supabase in .env first.');
const data = JSON.parse(await readFile(process.argv[2], 'utf8'));
for (const table of ['events', 'responses', 'opens'])
  if (!Array.isArray(data[table]))
    throw new Error(`Missing ${table} in the export.`);
const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
for (const [source, target, conflict] of [
  ['events', 'roza_events', 'slug'],
  ['responses', 'roza_responses', 'event_slug,guest_token'],
  ['opens', 'roza_opens', 'event_slug,guest_token'],
]) {
  for (let offset = 0; offset < data[source].length; offset += 100) {
    // Preserve existing target responses; retries are safe and do not overwrite newer replies.
    const { error } = await db
      .from(target)
      .upsert(data[source].slice(offset, offset + 100), {
        onConflict: conflict,
        ignoreDuplicates: true,
      });
    if (error)
      throw new Error(
        `Import stopped for ${source}: ${error.code}. Previously imported batches are retained; retry after resolving the error.`,
      );
  }
  console.log(
    `${source}: processed ${data[source].length} rows; existing rows were preserved.`,
  );
}

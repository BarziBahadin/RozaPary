import { createClient } from '@supabase/supabase-js';
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
  console.error(
    'Set SUPABASE_URL and SUPABASE_SECRET_KEY in .env before checking the connection.',
  );
  process.exit(1);
}
const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const { data, error } = await db.rpc('roza_get_event', {
  p_slug: 'adele-and-oliver',
});
if (error) {
  console.error('Supabase check failed:', error.code, error.message);
  process.exit(1);
}
if (!data) {
  console.error(
    'The connection works, but the sample invitation is missing. Run the migration.',
  );
  process.exit(1);
}
console.log(
  'Supabase is connected; the invitation schema and sample event are ready.',
);

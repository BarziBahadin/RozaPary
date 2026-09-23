// Runs the real Next.js production server and Supabase SDK against a local RPC transport.
// PostgreSQL queries execute in PGlite; this is not a hosted Supabase verification.
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite();
await db.exec(
  'create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to service_role;',
);
await db.exec(
  await readFile(
    new URL(
      '../supabase/migrations/20260923140120_roza_invitations.sql',
      import.meta.url,
    ),
    'utf8',
  ),
);
await db.exec('set role service_role');
const secret = randomBytes(32).toString('hex');
const calls = {
  roza_get_event: ['p_slug'],
  roza_dashboard: ['p_slug'],
  roza_create_event: ['p_event'],
  roza_update_event: ['p_event'],
  roza_record_open: ['p_slug', 'p_guest_token'],
  roza_consume_rate_limit: ['p_key'],
  roza_save_rsvp: ['p_response', 'p_guest_token'],
};
const rpc = createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.headers.apikey !== secret) {
    res.writeHead(401).end('{}');
    return;
  }
  const name = req.url.split('/').pop();
  const args = calls[name];
  if (req.method !== 'POST' || !args) {
    res.writeHead(404).end('{}');
    return;
  }
  try {
    let body = '';
    for await (const chunk of req) body += chunk;
    const input = JSON.parse(body);
    const casts = args
      .map(
        (arg, i) =>
          `$${i + 1}::${['p_event', 'p_response'].includes(arg) ? 'jsonb' : 'text'}`,
      )
      .join(',');
    const values = args.map((arg) =>
      typeof input[arg] === 'object' ? JSON.stringify(input[arg]) : input[arg],
    );
    const { rows } = await db.query(
      `select public.${name}(${casts}) as result`,
      values,
    );
    res.end(JSON.stringify(rows[0].result ?? null));
  } catch (error) {
    res
      .writeHead(400)
      .end(
        JSON.stringify({
          code: error.code ?? 'TEST_ERROR',
          message: error.message,
        }),
      );
  }
});
rpc.listen(0, '127.0.0.1');
await once(rpc, 'listening');
const env = {
  ...process.env,
  SUPABASE_URL: `http://127.0.0.1:${rpc.address().port}`,
  SUPABASE_SECRET_KEY: secret,
  ADMIN_PASSWORD: secret,
  SITE_URL: 'http://localhost:3100',
  TEST_ORIGIN: 'http://localhost:3100',
};
const app = spawn(
  process.execPath,
  ['node_modules/next/dist/bin/next', 'start', '-p', '3100'],
  { env, stdio: ['ignore', 'pipe', 'pipe'] },
);
let logs = '';
app.stdout.on('data', (chunk) => {
  logs += chunk;
});
app.stderr.on('data', (chunk) => {
  logs += chunk;
});
try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (app.exitCode !== null)
      throw new Error('Next.js exited before readiness. ' + logs);
    try {
      const response = await fetch(env.TEST_ORIGIN);
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error('Next.js did not become ready. ' + logs);
  const checks = spawn(process.execPath, ['tests/integration.mjs'], {
    env,
    stdio: 'inherit',
  });
  const [code] = await once(checks, 'exit');
  if (code !== 0) throw new Error('API integration failed. ' + logs);
} finally {
  app.kill('SIGTERM');
  await once(app, 'exit');
  await new Promise((resolve) => rpc.close(resolve));
  await db.close();
}

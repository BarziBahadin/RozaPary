import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const sql = await readFile(
  new URL(
    '../supabase/migrations/20260923140120_roza_invitations.sql',
    import.meta.url,
  ),
  'utf8',
);
void test('Supabase migration, RSVP transactions, metrics and authorization work in PostgreSQL', async (t) => {
  const db = new PGlite();
  try {
    await db.exec(
      'create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to anon,authenticated,service_role;',
    );
    await db.exec(sql);
    const rpc = async (name, params = [], casts = []) => {
      assert.match(name, /^roza_[a-z_]+$/);
      const args = params
        .map((_, i) => `$${i + 1}::${casts[i] ?? 'text'}`)
        .join(',');
      return (
        await db.query(`select public.${name}(${args}) as result`, params)
      ).rows[0].result;
    };
    const sample = await rpc('roza_get_event', ['adele-and-oliver']);
    await t.test(
      'seeds the complete invitation and installs RLS on every table',
      async () => {
        assert.equal(sample.names, 'Adele & Oliver');
        const tables = await db.query(
          "select relname,relrowsecurity from pg_class where relname in ('roza_events','roza_responses','roza_opens','roza_rate_limits')",
        );
        assert.equal(tables.rows.length, 4);
        assert.ok(tables.rows.every((row) => row.relrowsecurity));
      },
    );
    const event = {
      ...sample,
      slug: 'postgres-test',
      date: '2099-06-19',
      replyBy: '2099-05-19',
    };
    await db.exec('set role service_role');
    await t.test('server role creates, reads, and edits events', async () => {
      await rpc('roza_create_event', [JSON.stringify(event)], ['jsonb']);
      assert.equal(
        (await rpc('roza_get_event', [event.slug])).slug,
        event.slug,
      );
      await rpc(
        'roza_update_event',
        [JSON.stringify({ ...event, venue: 'New venue' })],
        ['jsonb'],
      );
      assert.equal(
        (await rpc('roza_get_event', [event.slug])).venue,
        'New venue',
      );
      await assert.rejects(
        () => rpc('roza_create_event', [JSON.stringify(event)], ['jsonb']),
        { code: '23505' },
      );
    });
    const token = 'a'.repeat(64);
    const response = {
      eventSlug: event.slug,
      name: 'Taylor Guest',
      attendance: 'attending',
      plusOnes: 2,
      dietary: 'Vegetarian',
      message: 'Hello',
    };
    await t.test(
      'deduplicates opens and responses while including additional guests',
      async () => {
        await rpc('roza_record_open', [event.slug, token]);
        await rpc('roza_record_open', [event.slug, token]);
        await rpc(
          'roza_save_rsvp',
          [JSON.stringify(response), token],
          ['jsonb', 'text'],
        );
        const first = await rpc('roza_dashboard', [event.slug]);
        assert.equal(first.opens, 1);
        assert.equal(first.metrics.attending, 3);
        assert.equal(first.metrics.responses, 1);
        assert.equal(first.guests[0].dietary, 'Vegetarian');
        await rpc(
          'roza_save_rsvp',
          [JSON.stringify({ ...response, plusOnes: 1 }), token],
          ['jsonb', 'text'],
        );
        const second = await rpc('roza_dashboard', [event.slug]);
        assert.equal(second.metrics.attending, 2);
        assert.equal(second.guests[0].id, first.guests[0].id);
        assert.equal(second.guests[0].created_at, first.guests[0].created_at);
        assert.ok(!('guest_token' in second.guests[0]));
      },
    );
    await t.test(
      'declines clear additional guests and dietary requirements',
      async () => {
        await rpc(
          'roza_save_rsvp',
          [JSON.stringify({ ...response, attendance: 'declined' }), token],
          ['jsonb', 'text'],
        );
        const data = await rpc('roza_dashboard', [event.slug]);
        assert.equal(data.metrics.attending, 0);
        assert.equal(data.metrics.declined, 1);
        assert.equal(data.guests[0].dietary, '');
        assert.equal(data.guests[0].plus_ones, 0);
      },
    );
    await t.test(
      'rejects invalid counts and deadlines in the database',
      async () => {
        await assert.rejects(
          () =>
            rpc(
              'roza_save_rsvp',
              [JSON.stringify({ ...response, plusOnes: 9 }), token],
              ['jsonb', 'text'],
            ),
          { code: '23514' },
        );
        await rpc(
          'roza_update_event',
          [
            JSON.stringify({
              ...event,
              date: '2020-06-19',
              replyBy: '2020-05-19',
            }),
          ],
          ['jsonb'],
        );
        await assert.rejects(
          () =>
            rpc(
              'roza_save_rsvp',
              [JSON.stringify(response), token],
              ['jsonb', 'text'],
            ),
          { code: 'P0001' },
        );
      },
    );
    await t.test('rate limit increments atomically', async () => {
      assert.equal(await rpc('roza_consume_rate_limit', ['b'.repeat(64)]), 1);
      assert.equal(await rpc('roza_consume_rate_limit', ['b'.repeat(64)]), 2);
    });
    await db.exec('reset role');
    for (const role of ['anon', 'authenticated'])
      await t.test(
        `${role} cannot read guests or execute privileged RPCs`,
        async () => {
          await db.exec(`set role ${role}`);
          await assert.rejects(
            () => db.query('select * from public.roza_responses'),
            { code: '42501' },
          );
          await assert.rejects(() => rpc('roza_dashboard', [event.slug]), {
            code: '42501',
          });
          await assert.rejects(
            () =>
              rpc(
                'roza_save_rsvp',
                [JSON.stringify(response), token],
                ['jsonb', 'text'],
              ),
            { code: '42501' },
          );
          await db.exec('reset role');
        },
      );
    await t.test(
      'RLS denies rows even if table SELECT is accidentally granted',
      async () => {
        await db.exec(
          'grant select on public.roza_responses to anon; set role anon',
        );
        assert.equal(
          (await db.query('select * from public.roza_responses')).rows.length,
          0,
        );
        await db.exec('reset role');
      },
    );
  } finally {
    await db.close();
  }
});

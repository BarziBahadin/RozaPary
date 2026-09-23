// Run against a local server only. Creates one uniquely named test invitation.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const origin = process.env.TEST_ORIGIN ?? 'http://localhost:3000';
if (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname))
  throw new Error('Integration tests are restricted to localhost.');
const env = await readFile(new URL('../.env', import.meta.url), 'utf8');
const password =
  process.env.ADMIN_PASSWORD || env.match(/^ADMIN_PASSWORD=(.+)$/m)?.[1];
let hostCookie = '',
  guestCookie = '';
let checks = 0;
async function request(
  path,
  {
    method = 'GET',
    body,
    actor = 'anonymous',
    originHeader = origin,
    raw,
  } = {},
) {
  const response = await fetch(origin + path, {
    method,
    headers: {
      ...(method === 'GET'
        ? {}
        : { Origin: originHeader, 'Content-Type': 'application/json' }),
      Cookie:
        actor === 'host' ? hostCookie : actor === 'guest' ? guestCookie : '',
    },
    ...(method === 'GET' ? {} : { body: raw ?? JSON.stringify(body ?? {}) }),
  });
  const setCookie = response.headers.get('set-cookie');
  if (setCookie && actor === 'host') hostCookie = setCookie.split(';')[0];
  if (setCookie && actor === 'guest') guestCookie = setCookie.split(';')[0];
  const data = response.headers
    .get('content-type')
    ?.includes('application/json')
    ? await response.json()
    : await response.text();
  return { response, data };
}
function check(condition, label) {
  assert.ok(condition, label);
  checks++;
  console.log('PASS ' + label);
}
let result = await request('/api/admin/dashboard');
check(result.response.status === 401, 'anonymous dashboard access is denied');
result = await request('/api/admin/events', { method: 'POST', body: {} });
check(result.response.status === 401, 'anonymous event creation is denied');
result = await request('/api/admin/login', {
  method: 'POST',
  body: { password },
  originHeader: 'https://untrusted.example',
});
check(result.response.status === 403, 'cross-origin writes are rejected');
result = await request('/api/admin/login', {
  method: 'POST',
  body: { password },
  actor: 'host',
});
check(
  result.response.status === 200 && hostCookie.includes('roza_host='),
  'host login creates a session',
);
check(
  result.response.headers.get('set-cookie').includes('HttpOnly'),
  'session cookie is HttpOnly',
);
result = await request('/api/admin/dashboard', { actor: 'host' });
check(result.response.status === 200, 'authenticated dashboard loads');
const sample = result.data.events.find((x) => x.slug === 'adele-and-oliver');
assert.ok(sample);
const slug = 'integration-' + Date.now();
const event = {
  ...sample,
  slug,
  names: 'Integration Test Celebration',
  date: '2099-06-19',
  replyBy: '2099-05-19',
};
result = await request('/api/admin/events', {
  method: 'POST',
  body: event,
  actor: 'host',
});
check(result.response.status === 201, 'host creates an invitation');
result = await request('/api/admin/events', {
  method: 'POST',
  body: event,
  actor: 'host',
});
check(
  result.response.status === 409,
  'duplicate invitation links are rejected',
);
result = await request('/i/' + slug);
check(
  result.response.status === 200 && result.data.includes(event.names),
  'shareable invitation renders saved data',
);
result = await request('/api/admin/events', {
  method: 'PUT',
  body: { ...event, venue: 'Updated Venue' },
  actor: 'host',
});
check(result.response.status === 200, 'host edits invitation details');
result = await request('/api/opens', {
  method: 'POST',
  body: { eventSlug: slug },
  actor: 'guest',
});
check(result.response.status === 200, 'opening an invitation is recorded');
await request('/api/opens', {
  method: 'POST',
  body: { eventSlug: slug },
  actor: 'guest',
});
const rsvp = {
  eventSlug: slug,
  name: 'Test Guest',
  attendance: 'attending',
  plusOnes: 2,
  dietary: 'Nut allergy',
  message: 'Looking forward to it!',
};
result = await request('/api/rsvp', {
  method: 'POST',
  body: rsvp,
  actor: 'guest',
});
check(result.response.status === 200, 'guest RSVP persists');
result = await request('/api/admin/dashboard?event=' + slug, { actor: 'host' });
check(result.data.opens === 1, 'repeat opens in one browser are deduplicated');
check(
  result.data.metrics.attending === 3 && result.data.metrics.responses === 1,
  'attending metrics include additional guests',
);
check(
  result.data.guests[0].dietary === 'Nut allergy',
  'dietary requirements are available to the host',
);
result = await request('/api/rsvp', {
  method: 'POST',
  body: { ...rsvp, plusOnes: 1 },
  actor: 'guest',
});
check(result.response.status === 200, 'guest can update their RSVP');
result = await request('/api/admin/dashboard?event=' + slug, { actor: 'host' });
check(
  result.data.metrics.attending === 2 && result.data.metrics.responses === 1,
  'updates do not double-count guests',
);
result = await request('/api/rsvp', {
  method: 'POST',
  body: { ...rsvp, plusOnes: -1 },
  actor: 'guest',
});
check(
  result.response.status === 400,
  'invalid guest counts are rejected server-side',
);
result = await request('/api/rsvp', {
  method: 'POST',
  body: { ...rsvp, attendance: 'declined' },
  actor: 'guest',
});
check(result.response.status === 200, 'guest can decline');
result = await request('/api/admin/dashboard?event=' + slug, { actor: 'host' });
check(
  result.data.metrics.attending === 0 && result.data.guests[0].dietary === '',
  'declines clear guest counts and dietary requests',
);
result = await request('/api/rsvp', {
  method: 'POST',
  raw: '{"message":"' + 'x'.repeat(17000) + '"}',
  actor: 'guest',
});
check(result.response.status === 413, 'oversized request bodies are rejected');
result = await request('/api/calendar/' + slug);
check(
  result.response.status === 200 &&
    result.data.includes('DTSTART:20990619T140000Z'),
  'calendar resolves the venue time zone to UTC',
);
check(
  result.data.includes('LOCATION:Updated Venue'),
  'calendar reflects edited details',
);
result = await request('/i/does-not-exist');
check(result.response.status === 404, 'unknown invitations return 404');
await request('/api/admin/events', {
  method: 'PUT',
  body: { ...event, date: '2020-06-19', replyBy: '2020-05-19' },
  actor: 'host',
});
result = await request('/api/rsvp', {
  method: 'POST',
  body: rsvp,
  actor: 'guest',
});
check(
  result.response.status === 410,
  'expired invitations do not accept replies',
);
result = await request('/api/admin/logout', { method: 'POST', actor: 'host' });
check(result.response.status === 200, 'host logout succeeds');
result = await request('/api/admin/dashboard', { actor: 'host' });
check(result.response.status === 401, 'logged-out browser cannot read guests');
console.log(`\n${checks} integration checks passed. Test invitation: ${slug}`);

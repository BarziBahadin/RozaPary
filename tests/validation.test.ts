import test from 'node:test';
import assert from 'node:assert/strict';
import { parseEvent, parseRsvp, ValidationError } from '../lib/validation.ts';
import { demoEvent } from '../lib/event.ts';
const rsvp = {
  eventSlug: 'adele-and-oliver',
  name: 'A guest',
  attendance: 'attending',
  plusOnes: 2,
  dietary: 'Vegetarian',
  message: 'See you there',
};
void test('attendance counts accept integer guests and normalize input', () => {
  assert.equal(
    parseRsvp({ ...rsvp, name: '  Taylor Guest  ' }).name,
    'Taylor Guest',
  );
  assert.equal(parseRsvp(rsvp).plusOnes, 2);
});
void test('declining clears additional guests and dietary requirements', () => {
  const result = parseRsvp({ ...rsvp, attendance: 'declined' });
  assert.equal(result.plusOnes, 0);
  assert.equal(result.dietary, '');
});
void test('rejects invalid RSVP shapes and forged guest counts', () => {
  for (const payload of [
    null,
    [],
    { ...rsvp, plusOnes: 1.5 },
    { ...rsvp, plusOnes: 6 },
    { ...rsvp, plusOnes: -1 },
    { ...rsvp, plusOnes: '2' },
    { ...rsvp, name: '' },
    { ...rsvp, attendance: 'maybe' },
    { ...rsvp, message: 'x'.repeat(1001) },
  ])
    assert.throws(() => parseRsvp(payload), ValidationError);
});
void test('valid invitation retains all schedule moments', () => {
  assert.deepEqual(parseEvent(demoEvent), demoEvent);
});
void test('rejects invalid dates, slugs, times, time zones, and reply deadlines', () => {
  for (const patch of [
    { slug: '../../admin' },
    { slug: 'two--hyphens' },
    { date: '2027-02-30' },
    { date: '2027-13-01' },
    { time: '25:00' },
    { time: '12:60' },
    { timezone: 'Not/AZone' },
    { replyBy: '2028-01-01' },
    { schedule: [] },
    { schedule: Array(9).fill(demoEvent.schedule[0]) },
  ])
    assert.throws(
      () => parseEvent({ ...demoEvent, ...patch }),
      ValidationError,
    );
});
void test('accepts party invitations and optional dress code', () => {
  const result = parseEvent({
    ...demoEvent,
    kind: 'A birthday soirée',
    names: 'An evening for Sophia',
    initials: 'S',
    dressCode: '',
  });
  assert.equal(result.kind, 'A birthday soirée');
  assert.equal(result.dressCode, '');
});

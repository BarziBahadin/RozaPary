import type { Invitation } from './event';
export class ValidationError extends Error {}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new ValidationError('Please provide a valid form.');
  return value as Record<string, unknown>;
}
function str(value: unknown, label: string, min: number, max: number): string {
  if (
    typeof value !== 'string' ||
    value.trim().length < min ||
    value.trim().length > max
  )
    throw new ValidationError(`${label} must be ${min}–${max} characters.`);
  return value.trim();
}
function date(value: unknown, label: string) {
  const text = str(value, label, 10, 10);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(text) ||
    !Number.isFinite(Date.parse(text)) ||
    new Date(text).toISOString().slice(0, 10) !== text
  )
    throw new ValidationError(`${label} must be a valid date.`);
  return text;
}
export function parseRsvp(value: unknown) {
  const input = object(value);
  const eventSlug = str(input.eventSlug, 'Invitation', 1, 80);
  const name = str(input.name, 'Name', 2, 100);
  if (input.attendance !== 'attending' && input.attendance !== 'declined')
    throw new ValidationError('Please select your attendance.');
  const attendance = input.attendance;
  if (
    !Number.isInteger(input.plusOnes) ||
    Number(input.plusOnes) < 0 ||
    Number(input.plusOnes) > 5
  )
    throw new ValidationError(
      'Please select between 0 and 5 additional guests.',
    );
  const plusOnes = attendance === 'attending' ? Number(input.plusOnes) : 0;
  const dietary =
    attendance === 'attending'
      ? str(input.dietary ?? '', 'Dietary requirements', 0, 500)
      : '';
  return {
    eventSlug,
    name,
    attendance,
    plusOnes,
    dietary,
    message: str(input.message ?? '', 'Message', 0, 1000),
  };
}
export function parseEvent(value: unknown): Invitation {
  const input = object(value);
  const slug = str(input.slug, 'Invitation link', 3, 80);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
    throw new ValidationError(
      'Use lowercase letters, numbers and single hyphens in your link.',
    );
  const eventDate = date(input.date, 'Event date');
  const replyBy = date(input.replyBy, 'RSVP deadline');
  if (replyBy > eventDate)
    throw new ValidationError(
      'The RSVP deadline must be on or before the event.',
    );
  const time = str(input.time, 'Time', 5, 5);
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time))
    throw new ValidationError('Enter a valid event time.');
  const timezone = str(input.timezone, 'Time zone', 3, 80);
  try {
    new Intl.DateTimeFormat('en', { timeZone: timezone });
  } catch {
    throw new ValidationError(
      'Enter an IANA time zone, for example Europe/Rome.',
    );
  }
  if (
    !Array.isArray(input.schedule) ||
    input.schedule.length < 1 ||
    input.schedule.length > 8
  )
    throw new ValidationError('Add between 1 and 8 schedule moments.');
  return {
    slug,
    names: str(input.names, 'Names or event title', 2, 100),
    initials: str(input.initials, 'Monogram', 1, 12),
    kind: str(input.kind, 'Celebration type', 2, 60),
    date: eventDate,
    time,
    timezone,
    replyBy,
    venue: str(input.venue, 'Venue', 2, 150),
    location: str(input.location, 'Location', 2, 150),
    address: str(input.address, 'Address', 2, 250),
    dressCode: str(input.dressCode, 'Dress code', 0, 150),
    message: str(input.message, 'Welcome message', 2, 1500),
    schedule: input.schedule.map((item) => {
      const row = object(item);
      return {
        time: str(row.time, 'Schedule time', 1, 30),
        title: str(row.title, 'Moment title', 2, 80),
        description: str(row.description, 'Moment description', 0, 250),
      };
    }),
  };
}

import { getEvent } from '@/db';
import { handle, HttpError } from '@/lib/server';
const escape = (value: string) =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\r/g, '');
// RFC 5545 requires lines to be folded by octets, not JavaScript character count.
function fold(line: string) {
  let result = '',
    bytes = 0;
  for (const char of line) {
    const length = new TextEncoder().encode(char).length;
    if (bytes + length > 74) {
      result += '\r\n ';
      bytes = 1;
    }
    result += char;
    bytes += length;
  }
  return result;
}
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  return handle(async () => {
    const event = await getEvent((await params).slug);
    if (!event) throw new HttpError('Invitation not found.', 404);
    // Resolve the event's wall-clock time against its IANA zone, independent of the guest's zone.
    const wall = new Date(`${event.date}T${event.time}:00Z`);
    let utc = wall.getTime();
    for (let i = 0; i < 3; i++) {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: event.timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      }).formatToParts(new Date(utc));
      const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
      const display = Date.UTC(
        +p.year,
        +p.month - 1,
        +p.day,
        +p.hour,
        +p.minute,
        +p.second,
      );
      utc += wall.getTime() - display;
    }
    const timestamp = (value: number) =>
      new Date(value)
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}/, '');
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Roza//Invitations//EN',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${event.slug}@roza.invitation`,
      `DTSTAMP:${timestamp(Date.now())}`,
      `DTSTART:${timestamp(utc)}`,
      'DURATION:PT6H',
      `SUMMARY:${escape(event.names + ' — ' + event.kind)}`,
      `LOCATION:${escape(event.venue + ', ' + event.address)}`,
      `DESCRIPTION:${escape(event.message)}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ];
    return new Response(lines.map(fold).join('\r\n') + '\r\n', {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${event.slug}.ics"`,
        'Cache-Control': 'no-store',
      },
    });
  });
}

export type ScheduleItem = { time: string; title: string; description: string };
export type Invitation = {
  slug: string;
  names: string;
  initials: string;
  kind: string;
  date: string;
  time: string;
  timezone: string;
  venue: string;
  location: string;
  address: string;
  replyBy: string;
  dressCode: string;
  message: string;
  schedule: ScheduleItem[];
};
export const demoEvent: Invitation = {
  slug: 'adele-and-oliver',
  names: 'Adele & Oliver',
  initials: 'A & O',
  kind: 'Wedding celebration',
  date: '2027-06-19',
  time: '16:00',
  timezone: 'Europe/Rome',
  venue: 'Villa Balbiano',
  location: 'Lake Como, Italy',
  address: 'Via Regina, 2, 22010 Ossuccio CO, Italy',
  replyBy: '2027-05-19',
  dressCode: 'Black tie · A touch of romance',
  message:
    'With full hearts and our favorite people, we begin our forever. We would be so delighted to have you by our side.',
  schedule: [
    {
      time: '4:00 PM',
      title: 'The ceremony',
      description: 'A promise of forever, overlooking the lake.',
    },
    {
      time: '5:00 PM',
      title: 'A little aperitivo',
      description: 'Raise a glass in the gardens as the sun softens.',
    },
    {
      time: '7:00 PM',
      title: 'Dinner & dancing',
      description: 'An evening of candlelight, good company, and celebration.',
    },
  ],
};
export function prettyDate(date: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(
    'en-GB',
    options ?? { day: 'numeric', month: 'long', year: 'numeric' },
  ).format(new Date(date + 'T12:00:00Z'));
}

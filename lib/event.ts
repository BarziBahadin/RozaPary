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
  slug: 'roza-and-soran',
  names: 'Roza & Soran',
  initials: 'R & S',
  kind: 'Engagement celebration',
  date: '2027-06-19',
  time: '16:00',
  timezone: 'Asia/Baghdad',
  venue: 'The Garden Hall',
  location: 'Erbil, Kurdistan',
  address: 'Erbil, Kurdistan',
  replyBy: '2027-05-19',
  dressCode: 'Soft formal · Burgundy, cream, or warm neutrals',
  message:
    'With full hearts and our favorite people, we begin our forever. We would be honored to have you by our side.',
  schedule: [
    {
      time: '4:00 PM',
      title: 'Guest arrival',
      description: 'A warm welcome as the evening softly begins.',
    },
    {
      time: '5:00 PM',
      title: 'The engagement',
      description: 'A promise, a ring, and a room full of love.',
    },
    {
      time: '7:00 PM',
      title: 'Dinner & dancing',
      description: 'Candlelight, music, and a beautiful celebration.',
    },
  ],
};
export function prettyDate(date: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(
    'en-GB',
    options ?? { day: 'numeric', month: 'long', year: 'numeric' },
  ).format(new Date(date + 'T12:00:00Z'));
}

import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Roza — The Art of Inviting',
  description:
    'Thoughtfully made. Beautifully celebrated. Create and share luxury interactive wedding and party invitations.',
  icons: { icon: '/favicon.svg' },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

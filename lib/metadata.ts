import type { Metadata } from 'next';
import { env } from 'cloudflare:workers';
import { demoEvent, prettyDate, type Invitation } from './event';
export function invitationMetadata(event: Invitation, path: string): Metadata {
  const origin = (env as unknown as { SITE_URL?: string }).SITE_URL;
  const title = `${event.names} — You're invited | Roza`;
  const description = `${event.kind} · ${prettyDate(event.date)} · ${event.location}. A little envelope. A lifetime of memories.`;
  // The artwork depicts the original sample by name. Never attach it to another event.
  const image =
    origin && event.slug === demoEvent.slug && event.names === demoEvent.names
      ? new URL('/og.png', origin).href
      : null;
  return {
    title,
    description,
    ...(origin
      ? { alternates: { canonical: new URL(path, origin).href } }
      : {}),
    openGraph: {
      title,
      description,
      type: 'website',
      images: image
        ? [
            {
              url: image,
              width: 1536,
              height: 1024,
              alt: 'Adele & Oliver — A little envelope. A lifetime of memories.',
            },
          ]
        : [],
    },
    twitter: {
      title,
      description,
      card: image ? 'summary_large_image' : 'summary',
      images: image ? [image] : [],
    },
  };
}

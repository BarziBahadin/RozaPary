import { getEvent } from '@/db';
import { InvitationExperience } from '@/components/invitation/experience';
import { invitationMetadata } from '@/lib/metadata';
import { notFound } from 'next/navigation';
export const dynamic = 'force-dynamic';
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const event = await getEvent((await params).slug);
  return event
    ? invitationMetadata(event, `/i/${event.slug}`)
    : {
        title: 'Invitation not found | Roza',
        openGraph: { images: [] },
        twitter: { images: [] },
      };
}
export default async function InvitationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const event = await getEvent((await params).slug);
  if (!event) notFound();
  return <InvitationExperience event={event} />;
}

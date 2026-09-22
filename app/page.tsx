import { InvitationExperience } from '@/components/invitation/experience';
import { demoEvent } from '@/lib/event';
import { getEvent } from '@/db';
import { invitationMetadata } from '@/lib/metadata';
export const dynamic = 'force-dynamic';
export async function generateMetadata() {
  return invitationMetadata((await getEvent(demoEvent.slug)) ?? demoEvent, '/');
}
export default async function Home() {
  return (
    <InvitationExperience
      event={(await getEvent(demoEvent.slug)) ?? demoEvent}
    />
  );
}

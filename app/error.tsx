'use client';
import { Button } from '@/components/ui/button';
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="empty-page">
      <p className="eyebrow">A LITTLE PAUSE</p>
      <h1>
        One moment,
        <br />
        <em>dear guest.</em>
      </h1>
      <p>We couldn’t load your invitation just now. Please try again.</p>
      <Button
        className="primary-button"
        onClick={reset}
        style={{ marginTop: 25 }}
      >
        Try again
      </Button>
    </main>
  );
}

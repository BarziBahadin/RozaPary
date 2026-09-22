import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="empty-page">
      <p className="eyebrow">ROZA · AN INVITATION TO CONNECT</p>
      <h1>
        This envelope
        <br />
        has gone astray.
      </h1>
      <p>
        We couldn’t find this invitation. Please check the link with your host.
      </p>
      <Link className="text-link" href="/">
        Explore a sample invitation →
      </Link>
    </main>
  );
}

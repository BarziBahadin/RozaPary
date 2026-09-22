'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  VolumeX,
  Volume2,
  Flower2,
  Sparkles,
  MapPin,
  CalendarDays,
  Clock3,
  Share2,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type Invitation, prettyDate } from '@/lib/event';
import { RsvpForm } from './rsvp-form';
import { useInvitationAudio } from './audio';
function Butterfly({ className }: { className: string }) {
  return (
    <svg
      className={`butterfly ${className}`}
      viewBox="0 0 60 50"
      fill="currentColor"
      aria-hidden="true"
    >
      <g className="left-wing">
        <path d="M29 24C20-7-7 3 7 23c-17 15 10 31 22 3Z" />
      </g>
      <g className="right-wing">
        <path d="M31 24C40-7 67 3 53 23c17 15-10 31-22 3Z" />
      </g>
      <path d="M29 15h2v25h-2z" />
    </svg>
  );
}
export function InvitationExperience({ event }: { event: Invitation }) {
  const [phase, setPhase] = useState<'sealed' | 'opening' | 'open'>('sealed');
  const [shareStatus, setShareStatus] = useState('');
  const [shareFallback, setShareFallback] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cover = useRef<HTMLElement>(null);
  const opening = useRef(false);
  const tracked = useRef(false);
  const audio = useInvitationAudio();
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  function openInvitation(target?: string) {
    if (phase === 'open') {
      if (target)
        document.getElementById(target)?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (opening.current) return;
    opening.current = true;
    setPhase('opening');
    void audio.rustle();
    if (!tracked.current) {
      tracked.current = true;
      void fetch('/api/opens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventSlug: event.slug }),
      }).catch(() => {
        tracked.current = false;
      });
    }
    timer.current = setTimeout(
      () => {
        setPhase('open');
        opening.current = false;
        requestAnimationFrame(() => {
          if (target)
            document
              .getElementById(target)
              ?.scrollIntoView({ behavior: 'smooth' });
          else {
            cover.current?.scrollIntoView({ behavior: 'smooth' });
            cover.current?.focus({ preventScroll: true });
          }
        });
      },
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 30 : 2200,
    );
  }
  async function share() {
    const url = `${window.location.origin}/i/${event.slug}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${event.names} — You're invited`,
          url,
        });
        setShareStatus('Invitation shared.');
      } else {
        await navigator.clipboard.writeText(url);
        setShareStatus('Invitation link copied.');
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      setShareFallback(url);
      setShareStatus('Copy the invitation link below.');
    }
  }
  return (
    <main className={`invitation-shell phase-${phase}`}>
      {phase === 'open' && (
        <>
          <a className="skip-link" href="#celebration">
            Skip to event details
          </a>
          <header className="site-header">
            <Link href="/" className="wordmark" aria-label="Roza home">
              roza<span>THE ART OF INVITING</span>
            </Link>
            <nav aria-label="Invitation navigation">
              <a
                href="#invitation"
                onClick={() => {
                  if (phase === 'open')
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                The invitation
              </a>
              <a href="#celebration">The celebration</a>
              <a
                href="#rsvp"
                onClick={(e) => {
                  if (phase !== 'open') {
                    e.preventDefault();
                    openInvitation('rsvp');
                  }
                }}
              >
                Kindly RSVP <ArrowUpRight size={13} />
              </a>
            </nav>
            <Button
              className="sound-control"
              variant="ghost"
              onClick={audio.toggle}
              aria-label={
                audio.playing
                  ? 'Pause background music'
                  : 'Play background music'
              }
              aria-pressed={audio.playing}
            >
              {audio.playing ? <Volume2 size={17} /> : <VolumeX size={17} />}
              <span>{audio.playing ? 'Sound on' : 'Sound off'}</span>
            </Button>
          </header>
          {audio.error && (
            <p className="audio-notice" aria-live="polite">
              {audio.error}
            </p>
          )}
        </>
      )}
      {phase !== 'open' ? (
        <section
          className="invitation-hero envelope-only"
          id="invitation"
          aria-label={`${event.names} invitation`}
        >
          <h1 className="sr-only">An invitation from {event.names}</h1>
          <div className="ambient-dust" aria-hidden="true">
            {Array.from({ length: 24 }, (_, i) => (
              <i
                key={i}
                style={{
                  left: `${(i * 37) % 100}%`,
                  top: `${(i * 23) % 100}%`,
                  animationDelay: `${i * -0.7}s`,
                }}
              />
            ))}
          </div>
          <div className="envelope-stage">
            <div className="stage-orbit" />
            <p className="envelope-dedication">
              A little something, just for you
            </p>
            <div className={`envelope ${phase === 'opening' ? 'is-open' : ''}`}>
              <div className="envelope-back" />
              <div className="insert-card">
                <span className="card-small">YOU ARE WARMLY INVITED</span>
                <span className="card-monogram">{event.initials}</span>
                <span className="card-small">{prettyDate(event.date)}</span>
              </div>
              <div className="envelope-front">
                <span className="envelope-emboss">{event.initials}</span>
                <span className="envelope-inscription">
                  a celebration of love
                </span>
              </div>
              <div className="envelope-flap" />
              <button
                className="wax-seal"
                aria-label="Break the seal and open your invitation"
                disabled={phase === 'opening'}
                onClick={() => openInvitation()}
              >
                <Flower2 size={32} />
              </button>
            </div>
            <Button
              className="open-invitation"
              disabled={phase === 'opening'}
              onClick={() => openInvitation()}
            >
              {phase === 'opening'
                ? 'A little magic is unfolding…'
                : 'Open your invitation'}{' '}
              <ArrowUpRight size={15} />
            </Button>
            <p className="tap-hint" aria-live="polite">
              {phase === 'opening'
                ? 'OUR FOREVER BEGINS WITH YOU.'
                : 'BREAK THE SEAL. LET THE MAGIC BEGIN.'}
            </p>
            <div className="stage-sparkle sparkle-one">
              <Sparkles />
            </div>
            <div className="stage-sparkle sparkle-two">
              <Sparkles size={16} />
            </div>
            <Butterfly className="butterfly-one" />
            <Butterfly className="butterfly-two" />
          </div>
        </section>
      ) : (
        <section
          className="opened-cover"
          id="invitation"
          ref={cover}
          tabIndex={-1}
          aria-label="Your invitation"
        >
          <div className="cover-border">
            <p className="eyebrow">YOU ARE JOYFULLY INVITED TO THE</p>
            <p className="cover-kind">{event.kind}</p>
            <span className="cover-monogram">{event.initials}</span>
            <h1>{event.names}</h1>
            <p className="cover-message">{event.message}</p>
            <div className="cover-date">
              <span>{prettyDate(event.date, { weekday: 'long' })}</span>
              <strong>
                {prettyDate(event.date, { day: 'numeric', month: 'long' })}
              </strong>
              <span>{event.date.slice(0, 4)}</span>
            </div>
            <p className="cover-location">
              {event.venue} <span>·</span> {event.location}
            </p>
            <a href="#rsvp" className="text-link">
              Joyfully RSVP <ArrowUpRight size={16} />
            </a>
            <Button
              variant="ghost"
              className="replay-button"
              onClick={() => {
                setPhase('sealed');
                opening.current = false;
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <RotateCcw size={12} />
              Replay the little magic
            </Button>
          </div>
          <Butterfly className="butterfly-one" />
          <Butterfly className="butterfly-two" />
        </section>
      )}
      {phase === 'open' && (
        <>
          <section className="celebration-section" id="celebration">
            <p className="eyebrow">THE BEGINNING OF A BEAUTIFUL MEMORY</p>
            <h2>
              One beautiful day.
              <br />
              <em>A lifetime of memories.</em>
            </h2>
            <p>{event.message}</p>
            <div className="event-details">
              <div>
                <CalendarDays size={21} strokeWidth={1} />
                <span className="detail-label">THE DAY</span>
                <h3>
                  {prettyDate(event.date, {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </h3>
                <p>{prettyDate(event.date, { weekday: 'long' })}</p>
                <a href={`/api/calendar/${event.slug}`} className="text-link">
                  Add to calendar <ArrowUpRight size={13} />
                </a>
              </div>
              <div>
                <MapPin size={21} strokeWidth={1} />
                <span className="detail-label">THE PLACE</span>
                <h3>{event.venue}</h3>
                <p>{event.location}</p>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue + ', ' + event.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-link"
                >
                  Find your way <ArrowUpRight size={13} />
                </a>
              </div>
              <div>
                <Clock3 size={21} strokeWidth={1} />
                <span className="detail-label">THE TIME</span>
                <h3>
                  {new Intl.DateTimeFormat('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    timeZone: 'UTC',
                  }).format(new Date(`2000-01-01T${event.time}:00Z`))}
                </h3>
                <p>Local time · {event.timezone.replaceAll('_', ' ')}</p>
                <span className="detail-note">
                  Please arrive 15 minutes early
                </span>
              </div>
            </div>
            <div className="dress-code">
              <span>DRESS FOR THE OCCASION</span>
              <p>
                {event.dressCode ||
                  'Wear something that makes you feel wonderful.'}
              </p>
            </div>
          </section>
          <section className="schedule-section">
            <div>
              <p className="eyebrow">LET THE DAY UNFOLD</p>
              <h2>
                A few moments
                <br />
                <em>to look forward to.</em>
              </h2>
              <p>
                Come for the celebration.
                <br />
                Stay for the memories.
              </p>
            </div>
            <ol className="schedule-list">
              {event.schedule.map((item, i) => (
                <li key={i}>
                  <span className="schedule-time">{item.time}</span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
          <RsvpForm event={event} />
          <div className="share-strip">
            <p>Good things are meant to be shared.</p>
            <Button variant="ghost" onClick={share}>
              <Share2 size={15} /> Share this invitation
            </Button>
            <span aria-live="polite">{shareStatus}</span>
            {shareFallback && (
              <input
                className="share-url"
                aria-label="Invitation link"
                readOnly
                value={shareFallback}
                onFocus={(e) => e.target.select()}
              />
            )}
          </div>
          <footer className="site-footer">
            <Link href="/" className="wordmark">
              roza
            </Link>
            <span>A little envelope. A lifetime of memories.</span>
            <Link href="/admin">
              Host your celebration <ArrowUpRight size={14} />
            </Link>
          </footer>
        </>
      )}
    </main>
  );
}

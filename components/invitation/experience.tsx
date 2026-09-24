'use client';
import Link from 'next/link';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  ArrowUpRight,
  VolumeX,
  Volume2,
  Flower2,
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
function BotanicalSprig({ className }: { className: string }) {
  return (
    <svg
      className={`botanical-sprig ${className}`}
      viewBox="0 0 170 230"
      fill="none"
      aria-hidden="true"
    >
      <path
        className="sprig-stem"
        d="M112 218C82 174 69 130 77 86c5-29 19-53 40-72"
      />
      <path d="M82 132C52 122 34 103 28 77c27 2 47 18 58 47" />
      <path d="M91 102C65 85 54 63 59 36c27 10 42 30 39 61" />
      <path d="M104 75c1-28 12-49 34-63 8 27 0 50-25 69" />
      <path d="M95 161c-25 1-45-9-60-30 25-8 47-1 66 22" />
      <path d="M108 187c-19 11-39 11-59 1 17-17 36-21 58-8" />
    </svg>
  );
}
export function InvitationExperience({ event }: { event: Invitation }) {
  const [firstName, secondName] = event.names
    .split(/\s*&\s*|\s+and\s+/i)
    .map((name) => name.trim());
  const [phase, setPhase] = useState<'sealed' | 'opening' | 'open'>('sealed');
  const [reveal, setReveal] = useState<CSSProperties | null>(null);
  const paper = useRef<HTMLDivElement>(null);
  const seal = useRef<HTMLButtonElement>(null);
  const [shareStatus, setShareStatus] = useState('');
  const [shareFallback, setShareFallback] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cover = useRef<HTMLElement>(null);
  const opening = useRef(false);
  const tracked = useRef(false);
  const hasStartedMusic = useRef(false);
  const audio = useInvitationAudio();
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  function finishOpening() {
    if (timer.current) clearTimeout(timer.current);
    setPhase('open');
    setReveal(null);
    opening.current = false;
    requestAnimationFrame(() => {
      // Keep the viewport still; focus must not introduce a second scrolling animation.
      window.scrollTo({ top: 0, behavior: 'instant' });
      cover.current?.focus({ preventScroll: true });
    });
  }
  function openInvitation() {
    if (opening.current || phase === 'open') return;
    opening.current = true;
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    setPhase('opening');
    // Use the opening gesture to unlock audio; replay preserves the guest’s sound choice.
    if (!hasStartedMusic.current) {
      hasStartedMusic.current = true;
      void audio.toggle();
    }
    void audio.rustle(reducedMotion ? 0 : 0.48);
    if (!tracked.current) {
      tracked.current = true;
      void fetch('/api/opens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventSlug: event.slug }),
      })
        .then((response) => {
          if (!response.ok) tracked.current = false;
        })
        .catch(() => {
          tracked.current = false;
        });
    }
    if (reducedMotion) {
      finishOpening();
      return;
    }
    // Seal (0–600ms), hinge (450–1450ms), paper lift (1200–2650ms).
    timer.current = setTimeout(() => {
      const bounds = paper.current?.getBoundingClientRect();
      if (!bounds) {
        finishOpening();
        return;
      }
      setReveal({
        '--paper-top': `${Math.max(0, bounds.top)}px`,
        '--paper-right': `${Math.max(0, window.innerWidth - bounds.right)}px`,
        '--paper-bottom': `${Math.max(0, window.innerHeight - bounds.bottom)}px`,
        '--paper-left': `${Math.max(0, bounds.left)}px`,
      } as CSSProperties);
      // Animation-end is the normal handoff. The timer also covers interrupted animations.
      timer.current = setTimeout(finishOpening, 1200);
    }, 2700);
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
    <main
      className={`invitation-shell phase-${phase}`}
      aria-busy={phase === 'opening'}
    >
      {reveal && (
        <div
          className="paper-reveal"
          style={reveal}
          aria-hidden="true"
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget) finishOpening();
          }}
        />
      )}
      {phase === 'open' && (
        <>
          <a className="skip-link" href="#celebration">
            Skip to event details
          </a>
          <header className="site-header">
            <a href="#invitation" className="couple-wordmark">
              {event.names}
            </a>
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
              <a href="#rsvp">
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
              A sealed invitation, made softly for you
            </p>
            <div className={`envelope ${phase === 'opening' ? 'is-open' : ''}`}>
              <div className="envelope-back" />
              <div className="insert-card" ref={paper} aria-hidden="true">
                <span className="card-small">WE'RE GETTING ENGAGED</span>
                <span className="card-monogram">{event.initials}</span>
                <span className="card-small">{prettyDate(event.date)}</span>
              </div>
              <div className="envelope-front">
                <span className="envelope-emboss">{event.initials}</span>
                <span className="envelope-inscription">open with love</span>
              </div>
              <div className="envelope-flap" aria-hidden="true">
                <span className="flap-face flap-outside" />
                <span className="flap-face flap-inside" />
              </div>
              <button
                ref={seal}
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
                ? 'The envelope is opening...'
                : 'Open your invitation'}{' '}
              <ArrowUpRight size={15} />
            </Button>
            <p className="tap-hint" aria-live="polite">
              {phase === 'opening'
                ? 'OUR FOREVER BEGINS WITH YOU.'
                : 'BREAK THE SEAL. LET THE EVENING BEGIN.'}
            </p>
            <BotanicalSprig className="sprig-one" />
            <BotanicalSprig className="sprig-two" />
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
            <p className="eyebrow">WE'RE GETTING ENGAGED</p>
            <p className="cover-kind">YOU'RE</p>
            <span className="cover-ampersand">&amp;</span>
            <h1>
              <span>{firstName || event.names}</span>
              <span>{secondName || ''}</span>
            </h1>
            <p className="cover-message">
              cordially
              <span>INVITED</span>
            </p>
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
                setReveal(null);
                window.scrollTo({ top: 0, behavior: 'instant' });
                requestAnimationFrame(() =>
                  seal.current?.focus({ preventScroll: true }),
                );
              }}
            >
              <RotateCcw size={12} />
              Replay the opening
            </Button>
          </div>
          <BotanicalSprig className="sprig-one" />
          <BotanicalSprig className="sprig-two" />
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

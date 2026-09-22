'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useState, type SubmitEvent } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Copy,
  Download,
  Eye,
  Heart,
  LoaderCircle,
  LogOut,
  Mail,
  Plus,
  RefreshCw,
  Settings2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { demoEvent, type Invitation, prettyDate } from '@/lib/event';
type Guest = {
  id: string;
  name: string;
  attendance: string;
  plus_ones: number;
  dietary: string;
  message: string;
  created_at: string;
  updated_at: string;
};
type Dashboard = {
  events: Invitation[];
  opens: number;
  metrics: { responses: number; attending: number; declined: number };
  guests: Guest[];
  updatedAt: string;
};
export function HostStudio() {
  const [auth, setAuth] = useState<'loading' | 'signed-out' | 'signed-in'>(
    'loading',
  );
  const [data, setData] = useState<Dashboard | null>(null);
  const [eventSlug, setEventSlug] = useState(demoEvent.slug);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editor, setEditor] = useState<{
    event: Invitation;
    isNew: boolean;
  } | null>(null);
  const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const response = await fetch(
          `/api/admin/dashboard?event=${encodeURIComponent(eventSlug)}`,
          { signal },
        );
        const result = (await response.json()) as Dashboard & {
          error?: string;
        };
        if (response.status === 401) {
          setAuth('signed-out');
          setData(null);
          return;
        }
        if (!response.ok)
          throw new Error(result.error ?? 'Could not load your guest list.');
        setData(result);
        setAuth('signed-in');
        setError('');
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(
          err instanceof Error
            ? err.message
            : 'Could not connect. Please try again.',
        );
        setAuth((current) => (current === 'loading' ? 'signed-out' : current));
      }
    },
    [eventSlug],
  );
  useEffect(() => {
    const controller = new AbortController();
    const initial = setTimeout(() => void load(controller.signal), 0);
    const timer = setInterval(() => {
      if (!document.hidden) void load(controller.signal);
    }, 15000);
    return () => {
      controller.abort();
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [load]);
  async function login(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: new FormData(e.currentTarget).get('password'),
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error);
      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Sign-in failed. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    try {
      const response = await fetch('/api/admin/logout', { method: 'POST' });
      if (!response.ok) throw new Error();
      setAuth('signed-out');
      setData(null);
      setEditor(null);
    } catch {
      setError('Could not sign out. Please try again.');
    }
  }
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/i/${eventSlug}`,
      );
      setNotice('Invitation link copied.');
    } catch {
      setNotice(
        `Your invitation link: ${window.location.origin}/i/${eventSlug}`,
      );
    }
  }
  function exportGuests() {
    if (!data) return;
    const safe = (value: string | number) => {
      let text = String(value ?? '');
      if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
      return '"' + text.replaceAll('"', '""') + '"';
    };
    const rows = [
      [
        'Name',
        'Attendance',
        'Additional guests',
        'Dietary requirements',
        'Message',
        'Replied at',
      ],
      ...data.guests.map((guest) => [
        guest.name,
        guest.attendance,
        guest.plus_ones,
        guest.dietary,
        guest.message,
        guest.updated_at,
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob(
        ['\uFEFF' + rows.map((row) => row.map(safe).join(',')).join('\r\n')],
        { type: 'text/csv;charset=utf-8' },
      ),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `${eventSlug}-responses.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const event =
    data?.events.find((item) => item.slug === eventSlug) ?? demoEvent;
  const guests =
    data?.guests.filter(
      (guest) =>
        (filter === 'all' || guest.attendance === filter) &&
        `${guest.name} ${guest.dietary}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    ) ?? [];
  return (
    <main className="studio">
      <header className="studio-header">
        <Link href="/" className="wordmark">
          roza<span>THE HOST STUDIO</span>
        </Link>
        <Link className="back-link" href="/">
          <ArrowLeft size={14} /> Back to invitation
        </Link>
        {auth === 'signed-in' && (
          <Button variant="ghost" className="studio-signout" onClick={logout}>
            <LogOut size={14} /> Sign out
          </Button>
        )}
      </header>
      {auth === 'loading' ? (
        <div className="studio-loading" aria-live="polite">
          <LoaderCircle className="spin" />
          <p>Preparing your host studio…</p>
        </div>
      ) : auth === 'signed-out' ? (
        <div className="studio-login">
          <div className="login-art">
            <Image
              unoptimized
              width={1536}
              height={1024}
              src="/og.png"
              alt="A burgundy velvet invitation with a gold wax seal"
            />
            <div>
              <p className="eyebrow">BEHIND EVERY BEAUTIFUL CELEBRATION</p>
              <h1>
                A little thought.
                <br />
                <em>A lot of love.</em>
              </h1>
            </div>
          </div>
          <form className="login-form" onSubmit={login}>
            <p className="eyebrow">WELCOME TO YOUR HOST STUDIO</p>
            <h2>
              Let’s make
              <br />
              <em>something memorable.</em>
            </h2>
            <p>
              Create your invitation, follow your guest list, and leave the
              details to us.
            </p>
            <label htmlFor="host-password">
              Host password
              <Input
                id="host-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                minLength={16}
                placeholder="Your private host password"
              />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <Button className="primary-button" type="submit" disabled={busy}>
              {busy ? (
                <LoaderCircle className="spin" size={16} />
              ) : (
                <>
                  Enter the studio <ArrowUpRight size={16} />
                </>
              )}
            </Button>
            <p className="login-note">
              Your guest list is private. Only your host password unlocks this
              space.
            </p>
          </form>
        </div>
      ) : (
        <div className="studio-content">
          <div className="studio-heading">
            <div>
              <p className="eyebrow">
                A LITTLE LESS PLANNING. A LITTLE MORE JOY.
              </p>
              <h1>
                Your celebration, <em>at a glance.</em>
              </h1>
              <p>Every reply brings your beautiful day a little closer.</p>
            </div>
            <Button
              className="primary-button"
              onClick={() =>
                setEditor({
                  event: { ...demoEvent, slug: '', names: '', initials: '' },
                  isNew: true,
                })
              }
            >
              <Plus size={15} /> Create invitation
            </Button>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="studio-notice" aria-live="polite">
              {notice}
              <Button
                variant="ghost"
                aria-label="Dismiss notification"
                onClick={() => setNotice('')}
              >
                <X size={14} />
              </Button>
            </p>
          )}
          <section className="event-toolbar">
            <div>
              <label htmlFor="event-select">YOUR INVITATION</label>
              <Select
                value={eventSlug}
                onValueChange={(value) => {
                  if (value) {
                    setData(null);
                    setEventSlug(value);
                  }
                }}
              >
                <SelectTrigger id="event-select" className="event-select">
                  <SelectValue>{event.names}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {data?.events.map((item) => (
                    <SelectItem key={item.slug} value={item.slug}>
                      {item.names}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p>
                {prettyDate(event.date)} · {event.location}
              </p>
            </div>
            <div className="event-actions">
              <a
                href={`/i/${eventSlug}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Eye size={15} /> Preview <ArrowUpRight size={12} />
              </a>
              <Button
                variant="outline"
                className="cream-button"
                onClick={() => setEditor({ event, isNew: false })}
                disabled={!data}
              >
                <Settings2 size={14} /> Edit details
              </Button>
              <Button
                variant="outline"
                className="cream-button"
                onClick={copyLink}
              >
                <Copy size={14} /> Copy link
              </Button>
            </div>
          </section>
          <section className="metrics" aria-label="Guest response statistics">
            {[
              {
                label: 'Invitations opened',
                value: data?.opens,
                icon: Eye,
                note: 'Unique browsers that opened the envelope',
              },
              {
                label: 'Joining the celebration',
                value: data?.metrics.attending,
                icon: Heart,
                note: 'Including all additional guests',
              },
              {
                label: 'Replies received',
                value: data?.metrics.responses,
                icon: Mail,
                note: `${data?.metrics.declined ?? 0} regretfully declined`,
              },
            ].map(({ label, value, icon: Icon, note }) => (
              <div className="metric" key={label}>
                <div>
                  <span>{label}</span>
                  <Icon size={18} strokeWidth={1} />
                </div>
                <strong>{value ?? '—'}</strong>
                <small>{note}</small>
              </div>
            ))}
          </section>
          <div className="guest-panels">
            <section className="guest-panel">
              <div className="panel-heading">
                <div>
                  <h2>Your lovely guests</h2>
                  <p>
                    <span className="live-dot" /> Refreshes every 15 seconds{' '}
                    {data &&
                      `· Updated ${new Date(data.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                  </p>
                </div>
                <div>
                  <Button
                    variant="ghost"
                    aria-label="Refresh responses"
                    onClick={() => void load()}
                  >
                    <RefreshCw size={15} />
                  </Button>
                  <Button
                    variant="outline"
                    className="cream-button"
                    disabled={!data?.guests.length}
                    onClick={exportGuests}
                  >
                    <Download size={14} /> Export
                  </Button>
                </div>
              </div>
              <div className="guest-filters">
                <Input
                  aria-label="Search guests by name or dietary requirement"
                  placeholder="Find a guest…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <fieldset aria-label="Filter guest responses">
                  {[
                    ['all', 'All replies'],
                    ['attending', 'Attending'],
                    ['declined', 'Declined'],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      aria-pressed={filter === value}
                      className={filter === value ? 'active' : ''}
                      onClick={() => setFilter(value)}
                    >
                      {label}
                    </button>
                  ))}
                </fieldset>
              </div>
              {guests.length ? (
                <div className="guest-table-scroll">
                  <table className="guest-table">
                    <thead>
                      <tr>
                        <th>Guest</th>
                        <th>Reply</th>
                        <th>Party size</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {guests.map((guest) => (
                        <tr key={guest.id}>
                          <td>
                            <strong>{guest.name}</strong>
                            <small>
                              {new Date(guest.updated_at).toLocaleDateString()}
                            </small>
                          </td>
                          <td>
                            <span
                              className={`response-badge ${guest.attendance}`}
                            >
                              {guest.attendance === 'attending'
                                ? 'Joyfully accepts'
                                : 'Regretfully declines'}
                            </span>
                          </td>
                          <td>
                            {guest.attendance === 'attending'
                              ? guest.plus_ones + 1
                              : '—'}
                          </td>
                          <td>
                            <span>{guest.dietary || '—'}</span>
                            {guest.message && (
                              <small className="guest-message">
                                “{guest.message}”
                              </small>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-guests">
                  <Mail size={32} strokeWidth={1} />
                  <h3>
                    {query || filter !== 'all'
                      ? 'No matching replies'
                      : 'The first reply is a little magic.'}
                  </h3>
                  <p>
                    {query || filter !== 'all'
                      ? 'Try another name or filter.'
                      : 'Share your invitation and watch the love arrive.'}
                  </p>
                  {!query && filter === 'all' && (
                    <Button
                      variant="outline"
                      className="cream-button"
                      onClick={copyLink}
                    >
                      <Copy size={14} /> Copy invitation link
                    </Button>
                  )}
                </div>
              )}
              {data && data.guests.length >= 1000 && (
                <p className="table-limit">
                  Showing the 1,000 most recent responses. Metrics include every
                  response.
                </p>
              )}
            </section>
            <aside className="dietary-panel">
              <p className="eyebrow">A THOUGHTFUL TABLE</p>
              <h2>Dietary notes</h2>
              <p>The little details that make everyone feel welcome.</p>
              {data?.guests.filter(
                (g) => g.attendance === 'attending' && g.dietary.trim(),
              ).length ? (
                <ul>
                  {data.guests
                    .filter(
                      (g) => g.attendance === 'attending' && g.dietary.trim(),
                    )
                    .map((g) => (
                      <li key={g.id}>
                        <strong>{g.name}</strong>
                        <span>{g.dietary}</span>
                        <small>Party of {g.plus_ones + 1}</small>
                      </li>
                    ))}
                </ul>
              ) : (
                <div className="dietary-empty">
                  <Check size={20} />
                  <p>
                    No dietary requests yet.
                    <br />
                    Guest preferences will appear here.
                  </p>
                </div>
              )}
            </aside>
          </div>
        </div>
      )}
      {editor && (
        <EventEditor
          event={editor.event}
          isNew={editor.isNew}
          close={() => setEditor(null)}
          saved={(savedEvent) => {
            setEditor(null);
            setEventSlug(savedEvent.slug);
            setNotice(`Your invitation for ${savedEvent.names} is ready.`);
            if (savedEvent.slug === eventSlug) void load();
          }}
        />
      )}
      <footer className="studio-footer">
        Thoughtfully made. Beautifully celebrated. <span>ROZA</span>
      </footer>
    </main>
  );
}
function EventEditor({
  event,
  isNew,
  close,
  saved,
}: {
  event: Invitation;
  isNew: boolean;
  close: () => void;
  saved: (event: Invitation) => void;
}) {
  const [draft, setDraft] = useState(event);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const update = (key: keyof Invitation, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));
  useEffect(() => {
    const before = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) close();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = before;
      document.removeEventListener('keydown', onKey);
    };
  }, [close, busy]);
  async function submit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/admin/events', {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const result = (await response.json()) as {
        error?: string;
        event: Invitation;
      };
      if (!response.ok) throw new Error(result.error ?? 'Please try again.');
      saved(result.event);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Your changes could not be saved.',
      );
    } finally {
      setBusy(false);
    }
  }
  // Native dialog provides focus trapping, a modal accessibility tree, and keyboard isolation.
  return (
    <dialog
      open
      className="editor-dialog"
      ref={(element) => {
        if (element && !element.matches(':modal')) {
          element.close();
          element.showModal();
        }
      }}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) close();
      }}
    >
      <div className="editor-heading">
        <div>
          <p className="eyebrow">MAKE IT YOUR OWN</p>
          <h2>
            {isNew ? 'A new beautiful beginning.' : 'The thoughtful details.'}
          </h2>
        </div>
        <Button
          variant="ghost"
          aria-label="Close invitation editor"
          disabled={busy}
          onClick={close}
        >
          <X size={20} />
        </Button>
      </div>
      <form className="editor-form" onSubmit={submit}>
        <div className="editor-grid">
          <label className="full">
            Names or celebration title
            <Input
              autoFocus
              value={draft.names}
              onChange={(e) => update('names', e.target.value)}
              placeholder="Adele & Oliver"
              required
              minLength={2}
              maxLength={100}
            />
          </label>
          <label>
            Monogram
            <Input
              value={draft.initials}
              onChange={(e) => update('initials', e.target.value)}
              placeholder="A & O"
              required
              maxLength={12}
            />
          </label>
          <label>
            Celebration type
            <Input
              value={draft.kind}
              onChange={(e) => update('kind', e.target.value)}
              placeholder="Wedding celebration"
              required
              maxLength={60}
            />
          </label>
          <label className="full">
            Invitation link
            <Input
              value={draft.slug}
              onChange={(e) => update('slug', e.target.value.toLowerCase())}
              disabled={!isNew}
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              minLength={3}
              maxLength={80}
              placeholder="adele-and-oliver"
            />
            <small>
              /i/{draft.slug || 'your-invitation'} · Keep this link for your
              guests.
            </small>
          </label>
          <label>
            Event date
            <Input
              type="date"
              value={draft.date}
              onChange={(e) => update('date', e.target.value)}
              required
            />
          </label>
          <label>
            Start time
            <Input
              type="time"
              value={draft.time}
              onChange={(e) => update('time', e.target.value)}
              required
            />
          </label>
          <label>
            Time zone
            <Input
              value={draft.timezone}
              onChange={(e) => update('timezone', e.target.value)}
              placeholder="Europe/Rome"
              required
            />
            <small>IANA zone, e.g. Asia/Baghdad</small>
          </label>
          <label>
            Reply by
            <Input
              type="date"
              value={draft.replyBy}
              max={draft.date}
              onChange={(e) => update('replyBy', e.target.value)}
              required
            />
          </label>
          <label>
            Venue
            <Input
              value={draft.venue}
              onChange={(e) => update('venue', e.target.value)}
              required
              maxLength={150}
            />
          </label>
          <label>
            City & country
            <Input
              value={draft.location}
              onChange={(e) => update('location', e.target.value)}
              required
              maxLength={150}
            />
          </label>
          <label className="full">
            Full address (for maps)
            <Input
              value={draft.address}
              onChange={(e) => update('address', e.target.value)}
              required
              maxLength={250}
            />
          </label>
          <label className="full">
            Dress code
            <Input
              value={draft.dressCode}
              onChange={(e) => update('dressCode', e.target.value)}
              maxLength={150}
            />
          </label>
          <label className="full">
            A message from the heart
            <Textarea
              value={draft.message}
              onChange={(e) => update('message', e.target.value)}
              required
              minLength={2}
              maxLength={1500}
              rows={3}
            />
          </label>
        </div>
        <div className="schedule-editor">
          <h3>The day’s little moments</h3>
          {draft.schedule.map((item, index) => (
            <div className="schedule-edit-row" key={index}>
              <label>
                Time
                <Input
                  aria-label={`Moment ${index + 1} time`}
                  value={item.time}
                  onChange={(e) =>
                    setDraft((current) => ({
                      ...current,
                      schedule: current.schedule.map((row, i) =>
                        i === index ? { ...row, time: e.target.value } : row,
                      ),
                    }))
                  }
                  required
                  maxLength={30}
                />
              </label>
              <label>
                Title
                <Input
                  value={item.title}
                  onChange={(e) =>
                    setDraft((current) => ({
                      ...current,
                      schedule: current.schedule.map((row, i) =>
                        i === index ? { ...row, title: e.target.value } : row,
                      ),
                    }))
                  }
                  required
                  maxLength={80}
                />
              </label>
              <label className="full">
                Description
                <Input
                  value={item.description}
                  onChange={(e) =>
                    setDraft((current) => ({
                      ...current,
                      schedule: current.schedule.map((row, i) =>
                        i === index
                          ? { ...row, description: e.target.value }
                          : row,
                      ),
                    }))
                  }
                  maxLength={250}
                />
              </label>
              <Button
                type="button"
                variant="ghost"
                disabled={draft.schedule.length <= 1}
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    schedule: current.schedule.filter((_, i) => i !== index),
                  }))
                }
              >
                Remove moment
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            className="cream-button"
            disabled={draft.schedule.length >= 8}
            onClick={() =>
              setDraft((current) => ({
                ...current,
                schedule: [
                  ...current.schedule,
                  { time: '', title: '', description: '' },
                ],
              }))
            }
          >
            <Plus size={14} /> Add a moment
          </Button>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="editor-actions">
          <Button type="button" variant="ghost" disabled={busy} onClick={close}>
            Cancel
          </Button>
          <Button type="submit" className="primary-button" disabled={busy}>
            {busy ? (
              <LoaderCircle className="spin" size={15} />
            ) : (
              <>
                {isNew ? 'Create invitation' : 'Save changes'}{' '}
                <ArrowUpRight size={15} />
              </>
            )}
          </Button>
        </div>
      </form>
    </dialog>
  );
}

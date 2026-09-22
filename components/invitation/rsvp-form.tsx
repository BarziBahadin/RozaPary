'use client';
import { useState, type SubmitEvent } from 'react';
import {
  ArrowUpRight,
  Check,
  Heart,
  Minus,
  Plus,
  LoaderCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { type Invitation, prettyDate } from '@/lib/event';
export function RsvpForm({ event }: { event: Invitation }) {
  const [attendance, setAttendance] = useState('');
  const [plusOnes, setPlusOnes] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  async function submit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!attendance) {
      setError('Please let us know if you can join us.');
      return;
    }
    setPending(true);
    setError('');
    const values = new FormData(e.currentTarget);
    try {
      const response = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventSlug: event.slug,
          name: values.get('name'),
          attendance,
          plusOnes,
          dietary: values.get('dietary') ?? '',
          message: values.get('message') ?? '',
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Please try again.');
      setSaved(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Your response could not be saved. Please try again.',
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="rsvp-section" id="rsvp">
      <div className="rsvp-intro">
        <span className="eyebrow">YOUR PLACE IN OUR STORY</span>
        <h2>
          It wouldn’t be
          <br />
          the same <em>without you.</em>
        </h2>
        <p>
          Kindly let us know by {prettyDate(event.replyBy)}.<br />
          We can’t wait to celebrate with you.
        </p>
        <Heart className="rsvp-heart" size={38} strokeWidth={0.7} />
      </div>
      <div className="rsvp-paper">
        {saved ? (
          <div className="rsvp-success" aria-live="polite">
            <span className="success-mark">
              <Check size={25} />
            </span>
            <p className="eyebrow">WITH LOVE & GRATITUDE</p>
            <h3>
              {attendance === 'attending'
                ? 'A place saved, just for you.'
                : 'You’ll be with us in spirit.'}
            </h3>
            <p>
              {attendance === 'attending'
                ? 'Your reply has arrived safely. We can’t wait to make beautiful memories together.'
                : 'Thank you for letting us know. We’ll be thinking of you on our special day.'}
            </p>
            <Button
              variant="outline"
              className="cream-button"
              onClick={() => setSaved(false)}
            >
              Update my response
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="rsvp-form">
            <p className="eyebrow">KINDLY RSVP</p>
            <h3>Will you join us?</h3>
            <label htmlFor="guest-name">
              Your full name
              <Input
                id="guest-name"
                name="name"
                placeholder="As you’d like it on your place card"
                required
                minLength={2}
                maxLength={100}
                autoComplete="name"
              />
            </label>
            <fieldset>
              <legend>Your reply</legend>
              <div className="attendance-options">
                {[
                  ['attending', 'Joyfully accepts'],
                  ['declined', 'Regretfully declines'],
                ].map(([value, label]) => (
                  <label
                    key={value}
                    className={attendance === value ? 'selected' : ''}
                  >
                    <input
                      type="radio"
                      name="attendance"
                      value={value}
                      checked={attendance === value}
                      onChange={() => setAttendance(value)}
                      required
                    />
                    <span>{label}</span>
                    {attendance === value && <Check size={14} />}
                  </label>
                ))}
              </div>
            </fieldset>
            {attendance === 'attending' && (
              <>
                <div className="plus-one-field">
                  <div>
                    <label id="plus-label" htmlFor="plus-count">
                      Additional guests
                    </label>
                    <small>Up to five loved ones</small>
                  </div>
                  <div className="stepper">
                    <Button
                      type="button"
                      variant="ghost"
                      aria-label="Remove one additional guest"
                      disabled={plusOnes === 0}
                      onClick={() => setPlusOnes((x) => x - 1)}
                    >
                      <Minus size={14} />
                    </Button>
                    <output
                      id="plus-count"
                      aria-labelledby="plus-label"
                      aria-live="polite"
                    >
                      {plusOnes}
                    </output>
                    <Button
                      type="button"
                      variant="ghost"
                      aria-label="Add one additional guest"
                      disabled={plusOnes === 5}
                      onClick={() => setPlusOnes((x) => x + 1)}
                    >
                      <Plus size={14} />
                    </Button>
                  </div>
                </div>
                <label htmlFor="dietary">
                  Dietary requirements{' '}
                  <span className="optional">(optional)</span>
                  <Input
                    id="dietary"
                    name="dietary"
                    maxLength={500}
                    placeholder="Allergies or preferences for your party"
                  />
                </label>
              </>
            )}
            <label htmlFor="guest-message">
              A little note <span className="optional">(optional)</span>
              <Textarea
                id="guest-message"
                name="message"
                maxLength={1000}
                placeholder="Leave a little love for the hosts…"
                rows={3}
              />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <Button className="primary-button" type="submit" disabled={pending}>
              {pending ? (
                <>
                  <LoaderCircle className="spin" size={16} /> Sending your reply
                </>
              ) : (
                <>
                  Send with love <ArrowUpRight size={16} />
                </>
              )}
            </Button>
            <p className="privacy-note">
              Your response is shared only with your host.
              <br />
              You can update it from this browser before the reply date.
            </p>
          </form>
        )}
      </div>
    </section>
  );
}

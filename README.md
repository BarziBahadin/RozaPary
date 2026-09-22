# Roza — luxury interactive invitations

A complete React 19 application with a tactile, CSS 3D envelope, animated invitation suite, persistent RSVPs, and a private host studio. Built with the Sites scaffold: Vinext (Next.js App Router compatible), TypeScript, Tailwind CSS, and Cloudflare D1/Drizzle.

**Database choice:** this deployment uses persistent D1 SQL rather than PostgreSQL/Prisma or Firebase. It runs locally without a database account and deploys with an automatically provisioned SQL database. The schema and all server-side queries live under `db/` and the API route files. D1 is not a mock or browser storage.

## Run locally

Requires Node.js 22.13+ and npm. Node.js 22.18+ is recommended for the built-in TypeScript test runner.

```sh
npm install
cp .env.example .env
# Set ADMIN_PASSWORD to a unique random password, at least 16 characters.
npm run dev
```

Open http://localhost:3000 for the invitation and http://localhost:3000/admin for the host studio. A random host password has already been generated in the local `.env` for this checkout. Keep that file private; it is ignored by Git. `SITE_URL` is the trusted absolute origin used for social metadata, not a forwarded request header.

The local D1 database persists in `.wrangler/`. The demo event is inserted only if absent. Restarting the server preserves invitations and responses. Production migrations are generated in `drizzle/` and included in the deployment bundle.

## Guest experience

- Mouse, keyboard, and touch can break the gold wax seal. The flap opens, the paper lifts, and the full invitation takes over the screen.
- Reduced-motion preferences skip long transitions and ambient effects. The opened invitation receives focus.
- A soft procedural paper rustle plays after the open gesture. Original Web Audio arpeggios play only after the guest opts in with the sound button; pausing and backgrounding the tab stop playback. No external music licensing or audio downloads are required.
- Floating gold dust and CSS 3D butterflies complement the burgundy/ivory layout.
- Event details include local time, an external Google Maps link, an RFC 5545 calendar download, a schedule, and dress code.
- RSVP supports full name, attending/declining, 0–5 additional guests, dietary requirements, and a personal message. Guest input is validated on the server. Late replies are rejected using the event’s local date.
- Same-browser resubmissions update the existing response. A cryptographically random HttpOnly guest cookie identifies the browser; only its SHA-256 digest is stored. Clearing cookies or changing devices creates a separate response. This is an open-link invitation model, not a named-guest allowlist.
- Opening counts represent unique browsers that unseal an envelope, not verified unique people. Links shared with anyone can be forwarded.

## Host studio

At `/admin`, sign in with `ADMIN_PASSWORD` to:

1. Create wedding, birthday, anniversary, or party invitations with unique `/i/{slug}` links.
2. Edit names, monogram, celebration type, date/time/timezone, RSVP date, location, welcome copy, and up to eight schedule moments.
3. Preview and copy guest links.
4. See unique envelope opens, total attending people including additional guests, replies, and declines.
5. Search/filter guest responses, inspect dietary notes, and export the most recent 1,000 responses as CSV. Dashboard metrics always count all responses. The UI refreshes every 15 seconds while visible.

This is a **single-host studio**, not a multi-tenant SaaS. All events belong to that host. Rotating the password invalidates all existing host sessions. Sessions expire after eight hours and use signed HttpOnly, SameSite cookies with Secure on HTTPS. Production authentication fails closed if a sufficiently long password is not configured.

## API

| Endpoint                          | Method | Access       | Purpose                                    |
| --------------------------------- | ------ | ------------ | ------------------------------------------ |
| `/api/opens`                      | POST   | Guest        | Record one envelope open per browser/event |
| `/api/rsvp`                       | POST   | Guest        | Create or update this browser’s response   |
| `/api/calendar/[slug]`            | GET    | Guest        | Download timezone-aware `.ics` file        |
| `/api/admin/login`                | POST   | Password     | Start a host session                       |
| `/api/admin/logout`               | POST   | Host browser | Clear the session cookie                   |
| `/api/admin/dashboard?event=slug` | GET    | Host         | Events, counts, guest and dietary data     |
| `/api/admin/events`               | POST   | Host         | Create an invitation                       |
| `/api/admin/events`               | PUT    | Host         | Update an invitation, keeping its slug     |

POST/PUT requests must use JSON and include a same-origin `Origin` header. All writes check the origin. Public write endpoints and host login are rate limited through persistent database counters. Payloads are capped at 16 KiB. SQL uses prepared statements. Host-only APIs independently validate authentication; hiding the page is not the security boundary. Guest-controlled content is rendered as text, and CSV exports neutralize formula prefixes.

RSVP JSON:

```json
{
  "eventSlug": "adele-and-oliver",
  "name": "Jordan Ellis",
  "attendance": "attending",
  "plusOnes": 1,
  "dietary": "One vegetarian meal",
  "message": "We can’t wait!"
}
```

Response: `{"success":true,"attendance":"attending"}`. Validation and operational failures return `{"error":"…"}` with an appropriate 4xx/5xx status. APIs do not return guest tokens or password values.

## Validation and deployment

```sh
npm test                  # Validation and domain edge cases
npm run test:integration  # Requires local server; exercises live APIs and SQL
npm run typecheck
npm run lint
npm run build
npm run db:generate       # Run after editing db/schema.ts; inspect generated SQL
```

Integration tests only permit localhost and create an isolated `integration-*` invitation, avoiding edits to the sample invitation. Remove those test records before sharing a local demo if desired; they are never uploaded to the production database.

The Sites build emits a Cloudflare-compatible Worker under `dist/server` and client assets under `dist/client`. Configure `ADMIN_PASSWORD` as a secret and `SITE_URL` as the site’s trusted HTTPS origin in the hosting environment. Keep the `DB` binding in `.openai/hosting.json`. Never commit `.env`, `.wrangler`, or host credentials.

A new Sites deployment is private to the owner. Guest links become usable by outside guests only after the owner changes site access. The host password remains required even when the guest-facing site is made public.

## Structure

- `components/invitation/` — envelope, invitation sections, RSVP form, and audio
- `components/host-studio.tsx` — authenticated dashboard and event editor
- `lib/event.ts` — shared event types and seed content
- `lib/validation.ts` — pure server input validation
- `lib/server.ts` — session signing, cookies, origin checks, throttling, bounded JSON
- `app/api/` — server endpoints
- `db/schema.ts`, `db/index.ts`, `drizzle/` — SQL schema, access and migrations
- `tests/` — domain tests and local API integration tests

The generated `public/og.png` is original invitation artwork. Typography loads from Google Fonts with serif/sans fallbacks. CSS and synthesized audio keep the core interaction lightweight; no WebGL is required.

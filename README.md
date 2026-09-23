# Roza — invitations with Next.js + Supabase

Roza now uses **standard Next.js 16, React 19, and Supabase PostgreSQL**. It deploys to **Vercel**. The invitation, animated envelope, sound, RSVP form, and host studio retain their existing design.

The earlier version used Vinext and Cloudflare D1. Its Cloudflare Worker output was not a standard Vercel/Next.js build, which caused framework and main-page detection problems. The new `next` dependency, standard scripts, and `vercel.json` make the deployment explicit. The main page is `app/page.tsx`.

## 1. Connect Supabase

1. Create or open a Supabase project.
2. In **SQL Editor**, paste and run the complete contents of [`supabase/migrations/20260923140120_roza_invitations.sql`](supabase/migrations/20260923140120_roza_invitations.sql). It creates the schema, protected database functions, and the sample Adele & Oliver invitation.
3. Get the project URL and **secret API key** from the project’s Connect dialog / **Settings → API Keys**.
4. Put the following in your local `.env` (keep your existing `ADMIN_PASSWORD` if desired):

```dotenv
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=sb_secret_your_secret_key
ADMIN_PASSWORD=your-unique-password-at-least-16-characters
SITE_URL=http://localhost:3000
```

Use a **secret key**, not a publishable key. The Supabase client exists only in `db/index.ts`, marked `server-only`. Do not name the secret `NEXT_PUBLIC_*`, put it in frontend code, commit it, or paste it into chat. This app does not require a public Supabase key.

Verify the live connection:

```sh
npm run db:check
```

Without Supabase credentials, the bundled sample invitation still renders, so you can preview the design. RSVP, event creation, and host login return a setup error instead of pretending to save data. Once connected, a missing migration also produces an explicit setup error.

## 2. Run locally

Requires Node.js 22.18 or later.

```sh
npm install
npm run dev
```

If an old Vinext server is running, stop it with Ctrl+C first. Open:

- Sample invitation: http://localhost:3000
- Direct invitation: http://localhost:3000/i/adele-and-oliver
- Host studio: http://localhost:3000/admin

Use `ADMIN_PASSWORD` to sign in. Create/edit invitations, copy guest links, inspect attendance and dietary notes, and export guest responses.

## 3. Deploy to Vercel

Push this updated source to the Git repository connected to Vercel, then redeploy.

| Setting          | Value                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------- |
| Framework Preset | **Next.js**                                                                                 |
| Root Directory   | The directory containing this `package.json` and `app/` (repository root for this checkout) |
| Install Command  | `npm ci`                                                                                    |
| Build Command    | `npm run build`                                                                             |
| Output Directory | **Leave the override disabled** — let Next.js/Vercel select it                              |
| Node.js          | 22.x or a supported newer version                                                           |

Remove any old `dist`, `dist/client`, `out`, Vite, or static-site overrides in the Vercel project. `vercel.json` already declares the Next.js framework.

Add these values under **Vercel → Project → Settings → Environment Variables**, for the environments you deploy:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY` (sensitive/server-only)
- `ADMIN_PASSWORD` (sensitive, at least 16 random characters)
- `SITE_URL` (optional; your canonical `https://...` production domain). If omitted, social metadata uses Vercel’s deployment URL. Do not set it to localhost on Vercel.

Redeploy after adding/changing environment variables. The app has dynamic `/`, `/i/[slug]`, and API routes; it is **not a static export** and must not use `output: 'export'`.

## What Supabase stores

| Table              | Contents                                                                      |
| ------------------ | ----------------------------------------------------------------------------- |
| `roza_events`      | Each invitation’s names, date, venue, message, and schedule                   |
| `roza_responses`   | Guest name, attendance, additional guests, dietary notes, message, timestamps |
| `roza_opens`       | Unique envelope opens per invitation/browser                                  |
| `roza_rate_limits` | Short-lived request counters for login and guest writes                       |

The app uses server-only Supabase RPC calls. All four tables have RLS enabled, no public read/write policies, and no permissions for `anon` or `authenticated`. The server’s secret key maps to `service_role`; only that role can execute the app’s RPCs. Every host API validates the signed host session. Public guest API routes validate and limit requests before invoking the database. This is a **single-host application**, not a multi-tenant platform.

RSVP writes preserve the original record ID and creation timestamp when the same browser responds again. Declines clear additional guests and dietary requirements. A random HttpOnly guest cookie identifies the browser; the database stores only its digest. Clearing cookies or switching devices creates a different response. Opening metrics represent browsers, not verified identities. The dashboard shows/export the most recent 1,000 responses, while totals count all responses.

## Existing D1 data

Switching code does **not** copy existing Cloudflare D1 invitations or replies into Supabase. The old live Sites deployment has not been republished or removed; its data remains there. Local `.wrangler/` data is also untouched. The earlier hosting identity and SQL migration are archived under `legacy/d1/` for reference and are not deployed by Next.js.

If you have existing guest replies, migrate them before handing out the new Vercel link. `scripts/export-d1.py` creates a private JSON export from a local D1 SQLite file; `scripts/import-d1.mjs` imports that export into the configured Supabase project, preserving event slugs, guest digests, and response timestamps. Hosted D1 needs its own export first. Exported guest data must never be committed. Cookies do not transfer across domains, so guests changing from the old domain to Vercel receive new browser identities.

## Checks

```sh
npm run typecheck
npm run lint
npm test                   # Pure input validation tests
npm run test:database      # Real PostgreSQL SQL/RLS tests in embedded PGlite
npm run build              # Standard Next.js production build
npm run test:local-api     # Real Next.js + Supabase SDK + local SQL-backed RPC harness
npm run db:check           # Live Supabase connection and schema check (needs .env)
npm run test:integration   # Existing local server + configured database; creates a test event
```

The local RPC harness validates the app’s production routes and SQL without Docker or hosted credentials. It is not a substitute for verifying the actual hosted Supabase project. `test:integration` is restricted to localhost and creates an `integration-*` event in that server’s configured database.

## Main files

- `components/invitation/` — envelope sequence, audio, invitation, RSVP
- `components/host-studio.tsx` — host login, event editor, live guest dashboard
- `app/api/` — guest and host endpoints
- `db/index.ts` — typed, server-only Supabase access
- `supabase/migrations/` — PostgreSQL schema, RPC functions, grants, RLS, seed
- `lib/server.ts` — authentication, cookies, bounded request bodies, origin checks, rate limiting
- `.env.example`, `vercel.json` — environment and hosting setup

Music starts on the first envelope-opening gesture and remains controllable. Reduced-motion preferences skip the extended opening sequence. Google Fonts supplies typography with local serif/sans fallbacks.

Official references: [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs), [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

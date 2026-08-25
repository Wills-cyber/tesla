# TESLA Electronics

A premium dark-theme platform concept for fixed-term investment plans modelled
around electric vehicles and mobility technology.

**This is a pre-launch product.** Deposits, withdrawals and live investment
activity are not implemented. Every figure attached to a plan is a *stated term*
— what a plan proposes if it performs as published — not a record of capital
received, held or paid. The dashboard shows zero
balances and empty histories because that is the genuine state of a pre-launch
account, not because data is missing.

**TESLA Electronics is an independent project and is not affiliated with,
endorsed by, or sponsored by Tesla, Inc.** Vehicle model names appear only as
descriptive references to electric vehicle market categories.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16.3 (App Router, Turbopack) |
| Language | TypeScript 5 (strict) |
| UI | React 19.2, Tailwind CSS 4, shadcn/ui (Radix) |
| Icons | Lucide |
| Animation | Motion 13 (`motion/react`) |
| Forms | react-hook-form + Zod 4 |
| Backend (prepared, not connected) | Supabase — Auth, Postgres, RLS |

## Getting started

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

No environment variables are required to run locally. Without Supabase
credentials the app runs in **preview mode**: the dashboard renders with a
visible "backend not connected" label and all figures read zero.

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build (runs TypeScript) |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |

## Routes

| Route | Description |
| --- | --- |
| `/` | Landing page — hero, plans, process, facts, vehicles, about, FAQ, CTA |
| `/login` · `/register` · `/forgot-password` | Authentication UI |
| `/dashboard` | Balances, quick actions, investment overview, recent activity, guide |
| `/invest` · `/invest/[slug]` | Plan marketplace and full plan terms + activation |
| `/investments` | The positions you hold, grouped active / pending / completed |
| `/wallet` | Balance, deposit dialog, withdrawal history, recent activity |
| `/wallet/activity` | Full account history with type filters |
| `/wallet/withdraw` · `/wallet/withdraw/[id]` | Five-step withdrawal flow and request status |
| `/notifications` | Notification feed with categories and read state |
| `/profile` | Details, account status, security, notifications, appearance, sign out |
| `/admin/notifications` | Admin broadcast surface (admins table only) |
| `/terms` · `/privacy` | Legal |

Legacy `/dashboard/*` URLs redirect to their new homes via `next.config.ts`.

## Architecture

```
src/
├─ app/
│  ├─ (marketing)/          Public shell: landing page + legal pages
│  ├─ (auth)/               Split-panel auth shell
│  ├─ dashboard/            Authenticated shell, one folder per section
│  ├─ layout.tsx            Root layout, fonts, metadata, skip link
│  ├─ error.tsx             Root error boundary
│  └─ not-found.tsx         404
├─ components/
│  ├─ ui/                   shadcn primitives
│  ├─ layout/               Header, footer, container, section, nav
│  ├─ brand/                Logo and mark
│  ├─ common/               Reveal, EmptyState, ComingSoonPanel, StatusPill…
│  ├─ marketing/            One component per landing-page band
│  ├─ investment/           Plan card, term sheet, active position panel
│  ├─ vehicles/             Vehicle imagery and showcase
│  ├─ auth/                 Auth card, fields, forms
│  ├─ dashboard/            Shell, nav, stat card, lists
│  └─ legal/                Legal page chrome
├─ config/                  Site, navigation, plans, vehicles, copy
├─ hooks/                   Scroll spy, media query, anchor scroll, auth form
├─ lib/
│  ├─ auth/                 AuthService contract + two implementations
│  ├─ data/                 Repository per table, all returning DataResult
│  ├─ supabase/             Browser / server / proxy clients
│  ├─ validations/          Zod schemas shared by client and server
│  ├─ env.ts  format.ts  motion.ts  utils.ts
├─ types/                   Domain types + database types
└─ proxy.ts                 Session refresh and optimistic route guard
```

### Two ideas do most of the work

**`DataResult<T>`** — every data-access function returns one of `ready`,
`unconfigured`, `unauthenticated` or `error`. `unconfigured` is a first-class
state, not a failure: before Supabase exists there is genuinely no data source,
and the UI is required to say so rather than invent numbers.

**`AuthService`** — one interface, two implementations. `supabaseAuthService` is
the real thing; `prelaunchAuthService` validates input and reports that
authentication isn't connected. It issues no session and never receives, hashes
or stores a password. `getAuthService()` picks between them on the presence of
two environment variables, so replacing the stand-in is configuration, not a
rewrite.

## Design system

Two themes in `src/app/globals.css`: a warm ivory light theme (the default) and a
deep-graphite dark preference, sharing one token vocabulary. The single decorative
accent is champagne-gold (`--gold-*`); every other hue is semantic and encodes
what a figure *is* — emerald for profit actually credited, blue for deposits and
system events, orange for pending/withdrawals, indigo for investments, red for
security and failure. Tinted panels (`.panel-tint` + `tint-*`) and `StatCard`
tones apply those hues consistently, and status pills never rely on colour alone.
Glass and glow are used sparingly — the navbar, one hero chip, a handful of
section washes. Type is self-hosted Geist (`src/app/fonts/`), so builds never
depend on Google Fonts.

Motion is centralised in `src/lib/motion.ts`: everything eases from the same
curve and nothing travels more than ~24px. `<MotionConfig reducedMotion="user">`
in `src/components/providers.tsx` makes Motion honour the OS reduce-motion
setting globally, and a `prefers-reduced-motion` block in `globals.css` covers the
CSS side.

## Replacing the vehicle artwork

The SVGs in `public/images/vehicles/` are placeholders. Every reference goes
through `src/config/vehicles.ts`, so swapping in licensed photography is a
one-line change per entry:

1. Drop the asset into `public/images/vehicles/` (1600×900 WebP/AVIF, transparent
   or near-black background).
2. Point `image` at it and update `width` / `height`.
3. For remote images, add the host to `images.remotePatterns` in `next.config.ts`
   and use the absolute URL.

`VehicleImage` handles sizing and lazy loading, so no component changes are
needed. It marks SVG sources `unoptimized` rather than enabling
`dangerouslyAllowSVG`; a raster drop-in turns optimisation back on automatically.

## Connecting Supabase

See [`supabase/README.md`](supabase/README.md) for the schema and
[`src/lib/supabase/README.md`](src/lib/supabase/README.md) for the client wiring.
In short:

1. Create the project, then `cp .env.example .env.local` and fill in
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
2. Apply `supabase/migrations/` in order.
3. Regenerate `src/types/database.ts` with `supabase gen types`.
4. Restart the dev server.

`isSupabaseConfigured()` then flips to `true`, the proxy starts guarding
`/dashboard`, and the data layer switches from `unconfigured` to live queries. No
component changes are required.

The service-role key must never appear in this application — it bypasses Row
Level Security, and `src/lib/env.ts` deliberately has no helper to read it.

## Product-integrity rules

These are load-bearing, not stylistic:

- No fake deposits, withdrawals, transactions, investors, balances or completed
  investment activity anywhere in the codebase.
- Stated plan terms are always distinguished from actual financial events, in the
  types (`statedWeeklyProfitCents` vs `paidProfitCents`), in the database, and in
  the copy.
- No fabricated company statistics — no investor counts, capital totals, payouts,
  AUM, success rates or partnerships. The statistics section reports product
  configuration only.
- Money-moving features stay behind `featureFlags` in `src/config/site.ts` and
  render a status panel with no form to submit.
- Plan figures are always described as stated terms, never as a record of funds
  received or paid.

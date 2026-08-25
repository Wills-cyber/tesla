# Supabase schema

SQL for the TESLA Electronics backend. **Nothing here has been applied yet** — the
app currently runs with `isSupabaseConfigured() === false` and renders honest
empty states.

For the client wiring and credential rules, see
[`src/lib/supabase/README.md`](../src/lib/supabase/README.md).

## Migrations

| File | Purpose |
| --- | --- |
| `migrations/0001_initial_schema.sql` | Enums, tables, constraints, triggers, RLS policies |
| `migrations/0002_seed_investment_plans.sql` | Seeds the published plan catalogue |
| `migrations/0003_wallet_and_payments.sql` | Wallet, crypto payments, `request_withdrawal` |
| `migrations/0004_withdrawal_experience.sql` | Fees, address book, cancellation, withdrawal v2 |
| `migrations/0005_seed_vehicle_investment_plans.sql` | The five vehicle plans, artwork URLs |
| `migrations/0006_go_live_investments_and_withdrawals.sql` | Open plans, `activate_investment`, first-generation notification triggers |
| `migrations/0007_open_withdrawal_networks.sql` | Enable withdrawal pairs; accounts start active |
| `migrations/0008_plan_artwork_png.sql` | Point plan artwork at PNG files |
| `migrations/0009_notifications_v2.sql` | Notification types, metadata, expiry, admin broadcasts, full auth-event set |

Apply them in order.

### Option A — Supabase CLI (recommended)

```bash
npx supabase link --project-ref <project-ref>
npx supabase db push
```

### Option B — SQL editor

Paste each file into the dashboard's SQL editor, in filename order, and run.

Afterwards, regenerate the TypeScript types over the hand-written stand-in:

```bash
npx supabase gen types typescript --project-id <project-ref> --schema public \
  > src/types/database.ts
```

## Tables

| Table | Written by | Client access |
| --- | --- | --- |
| `profiles` | Trigger on `auth.users` insert | Read + update own row |
| `investment_plans` | Seed / admin | Read (public) |
| `investments` | Server-side only | Read own rows |
| `investment_payments` | Server-side only | Read own (via parent investment) |
| `transactions` | Server-side only | Read own rows |
| `notifications` | DB triggers + definer functions | Read own rows; update `read_at` only |
| `admins` | Operator SQL only | No client access (RLS, zero policies) |
| `user_balances` | Trigger, derived from `transactions` | Read own row |

## Design decisions worth knowing

**Money is integer cents.** `bigint` throughout. No floating point touches a
balance.

**Balances are derived, not stored by the app.** `user_balances` is recomputed
from `transactions` by a trigger — a full recalculation rather than an increment,
so it cannot drift from the ledger. The application has no code path that writes
a balance, and RLS grants clients no INSERT or UPDATE on that table.

**Plan arithmetic is a database constraint.** `plans_total_profit_consistent` and
`plans_completion_consistent` mean a plan whose advertised figures don't add up
cannot be inserted at all. The same check runs in the UI
(`isPlanArithmeticConsistent`) to catch it during development.

**Transaction sign matches transaction type.** A `deposit` must be positive, a
`withdrawal` negative, enforced by `transactions_sign_matches_type`. A completed
transaction must carry a `settled_at`, and a non-completed one must not.

**No client write path to money.** There are deliberately no INSERT or UPDATE
policies for `transactions`, `investment_payments` or `user_balances`. Those rows
are written by server-side processes only. This is the database-level reason a
client cannot fabricate a deposit, a profit payment or a balance — it is not
merely a UI restriction.

**Plans seed as `coming_soon`.** Only an `open` plan should ever be fundable.
Nothing seeds as `open`; flipping that is a deliberate decision to be made after
payment processing and compliance review are complete.

## Notifications (0009)

Rule 13 from the migration header is worth restating: *a notification is a
report of something the database already recorded, and a failed report never
fails the thing it reports.* Financial notifications fire from `AFTER` triggers
whose inserts are wrapped in isolated subtransactions, so a bad notification row
can never roll back a deposit, withdrawal or investment.

- **Typed, not ad-hoc.** Every row carries a `notification_type` enum (`auth`,
  `security`, `deposit`, `withdrawal`, `investment`, `profit`, `wallet`,
  `system`, `promotion`, `announcement`) plus a `data` JSONB bag for
  transaction/investment ids, amounts, currency and references — never secrets.
- **Content is immutable.** A database trigger refuses any UPDATE that changes
  anything but `read_at`, so only marking-as-read happens through RLS.
- **Expiry is policy, not cleanup.** The SELECT policy hides expired rows, so
  they never reach a page, a badge or a realtime client. Optional maintenance:
  `select public.purge_expired_notifications();` (pg_cron or an external
  scheduler).
- **Admin broadcast.** `admins` is an explicit allow-list table with RLS enabled
  and zero policies. Add operators with:
  ```sql
  insert into public.admins (user_id) values ('<auth users id>');
  ```
  The admin form (`/admin/notifications`) and every write path go through
  `admin_create_notifications`, which re-checks `is_admin()` using `auth.uid()`.
- **Realtime.** `notifications` is published to `supabase_realtime` (RLS
  respected, so a subscriber only ever receives their own rows). The client holds
  one channel per signed-in tab — no polling.

### Browser push (future, ready)

The in-app system is realtime only, deliberately. Browser push can be layered on
later without reworking anything: `notifications` already exposes every field a
service-worker push needs (title, body, href, type, `created_at`), `data` can
carry a push-safe payload, and `expires_at` gives push a natural TTL. When it is
added, keep the service worker + VAPID keys server-side (Web Push payloads are
signed with the private VAPID key, which must never reach the browser build),
and keep fire-and-forget semantics: push delivery is best-effort on top of the
in-app feed, never a replacement for it.

## Verifying RLS after applying

```sql
-- Every table should report rowsecurity = true.
select relname, relrowsecurity
from pg_class
where relnamespace = 'public'::regnamespace and relkind = 'r'
order by relname;

-- Confirm no client-writable policies exist on the money tables.
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('transactions', 'investment_payments', 'user_balances')
order by tablename, policyname;

-- Notifications: SELECT + UPDATE (read_at only), never INSERT or DELETE.
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'notifications'
order by policyname;
```

The second query should return `SELECT` rows only.

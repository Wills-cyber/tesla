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
| `notifications` | Server-side only | Read own; update `read_at` |
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
will be written by server-side processes that do not exist yet. This is the
database-level reason a client cannot fabricate a deposit, a profit payment or a
balance — it is not merely a UI restriction.

**Plans seed as `coming_soon`.** Only an `open` plan should ever be fundable.
Nothing seeds as `open`; flipping that is a deliberate decision to be made after
payment processing and compliance review are complete.

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
```

The second query should return `SELECT` rows only.

-- =============================================================================
-- TESLA Electronics — initial schema
--
-- Design rules this file follows:
--
--   1. Money is stored in integer cents. No floats anywhere near a balance.
--   2. `user_balances` is derived, never written by the app. A trigger maintains
--      it from *settled* transactions only, so a balance cannot be set directly
--      and cannot drift from the ledger.
--   3. Row Level Security is enabled on every table, and the default is deny.
--      Users can read their own rows and nothing else.
--   4. Nothing in this schema lets a client insert a deposit, a profit payment
--      or a balance. Those rows come from server-side processes that do not
--      exist yet, which is why the product ships with deposits disabled.
-- =============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------- enum types
create type public.account_status as enum (
  'pending_verification',
  'active',
  'suspended'
);

create type public.plan_status as enum (
  'coming_soon',
  'open',
  'closed',
  'sold_out'
);

create type public.investment_status as enum (
  'pending_activation',
  'active',
  'completed',
  'cancelled'
);

create type public.investment_payment_status as enum (
  'scheduled',
  'paid',
  'skipped'
);

create type public.transaction_type as enum (
  'deposit',
  'withdrawal',
  'investment',
  'profit_payment',
  'principal_return',
  'referral_bonus',
  'adjustment'
);

create type public.transaction_status as enum (
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled'
);

create type public.notification_category as enum (
  'account',
  'investment',
  'transaction',
  'security',
  'platform'
);

-- --------------------------------------------------------- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------------- profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  referral_code text unique,
  referred_by uuid references public.profiles (id) on delete set null,
  account_status public.account_status not null default 'pending_verification',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_email_format check (position('@' in email) > 1),
  constraint profiles_not_self_referred check (referred_by is distinct from id)
);

create index profiles_referred_by_idx on public.profiles (referred_by);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------- investment_plans
create table public.investment_plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  summary text not null default '',
  vehicle_type text not null,
  currency text not null default 'USD',
  investment_amount_cents bigint not null,
  duration_days integer not null,
  stated_weekly_profit_cents bigint not null,
  payment_periods integer not null,
  stated_total_profit_cents bigint not null,
  principal_cents bigint not null,
  completion_amount_cents bigint not null,
  status public.plan_status not null default 'coming_soon',
  image_key text not null default 'compact-sedan',
  featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint plans_amounts_non_negative check (
    investment_amount_cents >= 0
    and stated_weekly_profit_cents >= 0
    and stated_total_profit_cents >= 0
    and principal_cents >= 0
    and completion_amount_cents >= 0
  ),
  constraint plans_positive_term check (duration_days > 0 and payment_periods > 0),

  -- The advertised arithmetic is enforced by the database, not by trust: a plan
  -- whose stated figures don't add up cannot be stored at all.
  constraint plans_total_profit_consistent check (
    stated_total_profit_cents = stated_weekly_profit_cents * payment_periods
  ),
  constraint plans_completion_consistent check (
    completion_amount_cents = principal_cents + stated_total_profit_cents
  )
);

create index investment_plans_status_idx on public.investment_plans (status, sort_order);

create trigger investment_plans_set_updated_at
  before update on public.investment_plans
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- investments
create table public.investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan_id uuid not null references public.investment_plans (id) on delete restrict,
  status public.investment_status not null default 'pending_activation',
  principal_cents bigint not null,
  currency text not null default 'USD',
  -- Profit actually credited. Never derived from the plan's stated terms.
  paid_profit_cents bigint not null default 0,
  periods_paid integer not null default 0,
  started_at timestamptz,
  matures_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint investments_principal_positive check (principal_cents > 0),
  constraint investments_paid_profit_non_negative check (paid_profit_cents >= 0),
  constraint investments_periods_non_negative check (periods_paid >= 0),
  constraint investments_matures_after_start check (
    matures_at is null or started_at is null or matures_at > started_at
  ),
  -- An investment cannot be active without a start date.
  constraint investments_active_has_start check (
    status <> 'active' or started_at is not null
  )
);

create index investments_user_idx on public.investments (user_id, created_at desc);
create index investments_plan_idx on public.investments (plan_id);
create index investments_status_idx on public.investments (status);

create trigger investments_set_updated_at
  before update on public.investments
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------- investment_payments
create table public.investment_payments (
  id uuid primary key default gen_random_uuid(),
  investment_id uuid not null references public.investments (id) on delete cascade,
  period_index integer not null,
  amount_cents bigint not null,
  currency text not null default 'USD',
  status public.investment_payment_status not null default 'scheduled',
  due_at timestamptz not null,
  paid_at timestamptz,
  created_at timestamptz not null default now(),

  constraint payments_period_positive check (period_index > 0),
  constraint payments_amount_non_negative check (amount_cents >= 0),
  -- A payment marked paid must say when. Nothing is "paid" without a timestamp.
  constraint payments_paid_has_timestamp check (
    (status = 'paid') = (paid_at is not null)
  ),
  unique (investment_id, period_index)
);

create index investment_payments_investment_idx
  on public.investment_payments (investment_id, period_index);

-- --------------------------------------------------------------- transactions
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type public.transaction_type not null,
  status public.transaction_status not null default 'pending',
  -- Signed: positive credits the account, negative debits it.
  amount_cents bigint not null,
  currency text not null default 'USD',
  reference text not null default replace(gen_random_uuid()::text, '-', ''),
  description text,
  investment_id uuid references public.investments (id) on delete set null,
  metadata jsonb,
  created_at timestamptz not null default now(),
  settled_at timestamptz,

  constraint transactions_amount_non_zero check (amount_cents <> 0),
  constraint transactions_reference_unique unique (reference),
  -- Only a completed transaction may carry a settlement time, and it must.
  constraint transactions_settled_when_completed check (
    (status = 'completed') = (settled_at is not null)
  ),
  -- Direction is intrinsic to the type; the sign cannot contradict it.
  constraint transactions_sign_matches_type check (
    case type
      when 'deposit' then amount_cents > 0
      when 'profit_payment' then amount_cents > 0
      when 'principal_return' then amount_cents > 0
      when 'referral_bonus' then amount_cents > 0
      when 'withdrawal' then amount_cents < 0
      when 'investment' then amount_cents < 0
      else true -- 'adjustment' may go either way
    end
  )
);

create index transactions_user_idx on public.transactions (user_id, created_at desc);
create index transactions_type_idx on public.transactions (user_id, type);
create index transactions_investment_idx on public.transactions (investment_id);

-- -------------------------------------------------------------- notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category public.notification_category not null default 'platform',
  title text not null,
  body text not null,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx
  on public.notifications (user_id)
  where read_at is null;

-- ------------------------------------------------------------- user_balances
-- Derived table. The app only ever reads from it.
create table public.user_balances (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  currency text not null default 'USD',
  available_cents bigint not null default 0,
  total_invested_cents bigint not null default 0,
  total_profit_cents bigint not null default 0,
  pending_withdrawal_cents bigint not null default 0,
  updated_at timestamptz not null default now(),

  constraint balances_available_non_negative check (available_cents >= 0),
  constraint balances_invested_non_negative check (total_invested_cents >= 0),
  constraint balances_profit_non_negative check (total_profit_cents >= 0),
  constraint balances_pending_non_negative check (pending_withdrawal_cents >= 0)
);

-- =============================================================================
-- Balance maintenance
--
-- Recomputed from the ledger rather than incremented, so the balance is always a
-- pure function of the transactions table and can never drift. `security definer`
-- with a pinned `search_path` so it can write the derived row while RLS blocks
-- clients from doing so.
-- =============================================================================
create or replace function public.recalculate_user_balance(target_user uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.user_balances as balances (
    user_id,
    available_cents,
    total_invested_cents,
    total_profit_cents,
    pending_withdrawal_cents,
    updated_at
  )
  select
    target_user,
    coalesce(sum(amount_cents) filter (where status = 'completed'), 0),
    coalesce(-sum(amount_cents) filter (
      where status = 'completed' and type = 'investment'
    ), 0),
    coalesce(sum(amount_cents) filter (
      where status = 'completed'
        and type in ('profit_payment', 'referral_bonus')
    ), 0),
    coalesce(-sum(amount_cents) filter (
      where status in ('pending', 'processing') and type = 'withdrawal'
    ), 0),
    now()
  from public.transactions
  where user_id = target_user
  on conflict (user_id) do update
    set available_cents = excluded.available_cents,
        total_invested_cents = excluded.total_invested_cents,
        total_profit_cents = excluded.total_profit_cents,
        pending_withdrawal_cents = excluded.pending_withdrawal_cents,
        updated_at = excluded.updated_at;
end;
$$;

create or replace function public.transactions_refresh_balance()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalculate_user_balance(old.user_id);
    return old;
  end if;

  perform public.recalculate_user_balance(new.user_id);

  -- A user_id change has to settle both sides of the move.
  if tg_op = 'UPDATE' and old.user_id <> new.user_id then
    perform public.recalculate_user_balance(old.user_id);
  end if;

  return new;
end;
$$;

create trigger transactions_refresh_balance
  after insert or update or delete on public.transactions
  for each row execute function public.transactions_refresh_balance();

-- =============================================================================
-- Profile provisioning
--
-- A profile row is created for every new auth user, so the app never has to
-- write one from the client.
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '')
  )
  on conflict (id) do nothing;

  insert into public.user_balances (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- Row Level Security
--
-- Enabled on every table. Each policy is scoped to `auth.uid()`, so a signed-in
-- user can reach their own rows and nothing else. There are deliberately no
-- client INSERT or UPDATE policies on transactions, investment_payments or
-- user_balances: those are written by server-side processes only, which is what
-- makes it impossible for a client to fabricate a deposit or a balance.
-- =============================================================================
alter table public.profiles enable row level security;
alter table public.investment_plans enable row level security;
alter table public.investments enable row level security;
alter table public.investment_payments enable row level security;
alter table public.transactions enable row level security;
alter table public.notifications enable row level security;
alter table public.user_balances enable row level security;

-- profiles: own row, read and limited update
create policy "Profiles are readable by their owner"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "Profiles are updatable by their owner"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- investment_plans: public marketing content, readable by anyone
create policy "Investment plans are publicly readable"
  on public.investment_plans for select
  to anon, authenticated
  using (true);

-- investments: own rows, read only from the client
create policy "Investments are readable by their owner"
  on public.investments for select
  to authenticated
  using (auth.uid() = user_id);

-- investment_payments: readable via ownership of the parent investment
create policy "Investment payments are readable by the investment owner"
  on public.investment_payments for select
  to authenticated
  using (
    exists (
      select 1
      from public.investments
      where investments.id = investment_payments.investment_id
        and investments.user_id = auth.uid()
    )
  );

-- transactions: own rows, read only
create policy "Transactions are readable by their owner"
  on public.transactions for select
  to authenticated
  using (auth.uid() = user_id);

-- notifications: own rows; owner may mark as read
create policy "Notifications are readable by their owner"
  on public.notifications for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Notifications are markable as read by their owner"
  on public.notifications for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- user_balances: own row, read only
create policy "Balances are readable by their owner"
  on public.user_balances for select
  to authenticated
  using (auth.uid() = user_id);

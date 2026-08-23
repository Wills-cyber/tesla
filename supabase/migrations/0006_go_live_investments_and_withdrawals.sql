-- =============================================================================
-- Go-live: open the plans, enable payouts, activate investments for real.
--
-- Everything here is additive. No table is rebuilt, no column dropped, and every
-- statement is written to be re-runnable.
--
-- Five things happen:
--
--   1.  `cancelled` joins `withdrawal_status`. `cancel_withdrawal` already exists
--       and until now had to park cancellations somewhere else; a cancelled
--       payout is not a rejected one and the record should say which it was.
--   2.  The five vehicle plans move from `coming_soon` to `open`. Only `open`
--       plans can be entered — that check lives in `activate_investment`, not in
--       the UI.
--   3.  `withdrawals_enabled` becomes true, so `request_withdrawal` stops
--       refusing. The $500 minimum was already seeded and is unchanged.
--   4.  `activate_investment()` — the one path that may create an investment.
--   5.  Notification triggers for withdrawal, deposit and payment state changes.
--
-- -----------------------------------------------------------------------------
-- The rule this migration is built around
-- -----------------------------------------------------------------------------
-- Enabling withdrawals means a user may *submit a request*. It does not mean the
-- platform can move crypto: no signing key exists in this system and no provider
-- is connected. So a withdrawal is born `pending` and only an external process
-- may advance it. Nothing here writes `completed`, invents a `tx_hash`, or
-- notifies anyone that funds arrived — the triggers below fire *from* status
-- changes made by that process, they never make them.
-- =============================================================================

-- ------------------------------------------------------- 1. cancelled status
-- `if not exists` so re-running is safe. Enum additions cannot run inside a
-- transaction block in older Postgres; this is a top-level statement for that
-- reason.
alter type public.withdrawal_status add value if not exists 'cancelled';

-- ------------------------------------------------------------ 2. open the plans
-- Scoped to the five seeded slugs rather than a blanket update, so a plan added
-- later is not silently opened by re-running this file.
update public.investment_plans
   set status = 'open',
       updated_at = now()
 where slug in (
         'model-3-starter',
         'model-y-growth',
         'model-s-premium',
         'model-x-elite',
         'cybertruck-executive'
       )
   and status <> 'open';

-- --------------------------------------------------------- 3. enable withdrawals
-- The minimum stays at the seeded 50000 cents ($500). `request_withdrawal` reads
-- both of these from here, so this row is the switch — not a constant in the app.
insert into public.platform_settings (key, value)
values ('withdrawals_enabled', 'true'::jsonb)
on conflict (key) do update set value = excluded.value, updated_at = now();

insert into public.platform_settings (key, value)
values ('minimum_withdrawal_cents', '50000'::jsonb)
on conflict (key) do nothing;

-- =============================================================================
-- 4. activate_investment
--
-- The only way an `investments` row is ever created.
--
-- `security definer` so it can write the ledger row that RLS forbids clients from
-- writing, with `search_path` pinned so a caller cannot shadow `public`. It takes
-- the plan id and *nothing else*: the user comes from `auth.uid()`, and every
-- figure comes from the `investment_plans` row. A caller cannot name a price, a
-- profit, a duration or another user — there is no parameter for any of it.
--
-- One statement from the client's point of view, so it either all happens or none
-- of it does. That matters because the investment, the debit and the schedule are
-- only meaningful together: an investment with no debit is free money, and a debit
-- with no investment is theft.
--
-- What it does NOT do: mark any payment paid, credit any profit, or touch
-- `paid_profit_cents`. It writes the four periods as `scheduled` — a timetable,
-- not a receipt. Only a real profit transaction may ever flip one to `paid`.
-- =============================================================================
create or replace function public.activate_investment(p_plan_id uuid)
returns table (investment_id uuid, reference text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user      uuid := auth.uid();
  v_plan      public.investment_plans;
  v_available bigint;
  v_pending   bigint;
  v_spendable bigint;
  v_investment uuid;
  v_txn_ref   text;
  v_started   timestamptz := now();
  v_matures   timestamptz;
  v_period    integer;
begin
  if v_user is null then
    raise exception 'Sign in to activate an investment'
      using errcode = 'P0003';
  end if;

  select * into v_plan from public.investment_plans where id = p_plan_id;
  if v_plan.id is null then
    raise exception 'Unknown investment plan' using errcode = 'P0002';
  end if;

  -- The gate. A plan that is not open cannot be entered, whatever the UI showed.
  if v_plan.status <> 'open' then
    raise exception 'The % plan is not open for investment', v_plan.name
      using errcode = 'P0001';
  end if;

  -- Balance read from the derived table, never from the caller. Funds already
  -- reserved by a pending withdrawal are not spendable — otherwise the same
  -- dollar backs both a payout request and an investment.
  select coalesce(available_cents, 0), coalesce(pending_withdrawal_cents, 0)
    into v_available, v_pending
    from public.user_balances
   where user_id = v_user;

  v_spendable := coalesce(v_available, 0) - coalesce(v_pending, 0);

  if v_spendable < v_plan.investment_amount_cents then
    raise exception
      'Insufficient wallet balance. This plan needs %, and % is available.',
      to_char(v_plan.investment_amount_cents / 100.0, 'FM999,999,990.00'),
      to_char(greatest(v_spendable, 0) / 100.0, 'FM999,999,990.00')
      using errcode = 'P0004';
  end if;

  v_matures := v_started + make_interval(days => v_plan.duration_days);

  insert into public.investments (
    user_id, plan_id, status, principal_cents, currency, started_at, matures_at
  )
  values (
    v_user, v_plan.id, 'active', v_plan.investment_amount_cents, 'USD',
    v_started, v_matures
  )
  returning id into v_investment;

  -- The debit. `type = 'investment'` is negative by the
  -- `transactions_sign_matches_type` check, and `recalculate_user_balance` routes
  -- it into `total_invested_cents` as well as reducing `available_cents`. The
  -- balance is therefore updated by the ledger trigger, not by this function.
  insert into public.transactions (
    user_id, type, status, amount_cents, currency,
    description, investment_id, settled_at
  )
  values (
    v_user, 'investment', 'completed', -v_plan.investment_amount_cents, 'USD',
    'Investment activated — ' || v_plan.name, v_investment, v_started
  )
  returning reference into v_txn_ref;

  -- The stated schedule, as `scheduled` rows. Due dates are spread evenly across
  -- the term from the real start date, so period 4 of a 30-day plan lands on the
  -- maturity date rather than on a guess.
  for v_period in 1..v_plan.payment_periods loop
    insert into public.investment_payments (
      investment_id, period_index, amount_cents, currency, status, due_at
    )
    values (
      v_investment,
      v_period,
      v_plan.stated_weekly_profit_cents,
      'USD',
      'scheduled',
      v_started + make_interval(
        days => (v_plan.duration_days::numeric * v_period / v_plan.payment_periods)::int
      )
    );
  end loop;

  insert into public.notifications (user_id, category, title, body, href)
  values (
    v_user,
    'investment',
    'Investment Activated',
    'Your ' || v_plan.name || ' investment has been activated successfully. ' ||
    'Amount ' || to_char(v_plan.investment_amount_cents / 100.0, 'FM999,999,990.00') ||
    ' · started ' || to_char(v_started, 'DD/MM/YYYY') ||
    ' · expected completion ' || to_char(v_matures, 'DD/MM/YYYY') || '.',
    '/investments'
  );

  return query select v_investment, v_txn_ref;
end;
$$;

revoke all on function public.activate_investment(uuid) from public;
grant execute on function public.activate_investment(uuid) to authenticated;

-- =============================================================================
-- 5. Notifications from real state changes
--
-- Every one of these fires AFTER a row actually changed. That is the whole design
-- rule: a notification is a report of something the database already recorded, so
-- there is no path that announces an event that did not happen. In particular
-- "Withdrawal Completed" is unreachable until an external process sets
-- `status = 'completed'`, which nothing in this schema does on its own.
-- =============================================================================

create or replace function public.notify_withdrawal_status()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_title text;
  v_body  text;
  v_amount text := to_char(new.amount_cents / 100.0, 'FM999,999,990.00');
begin
  if tg_op = 'INSERT' then
    -- Submitted, not sent. The wording carries that distinction deliberately.
    insert into public.notifications (user_id, category, title, body, href)
    values (
      new.user_id, 'transaction', 'Withdrawal Request Submitted',
      'Your withdrawal request of ' || v_amount ||
      ' has been submitted and is pending processing. Reference ' ||
      upper(substr(replace(new.id::text, '-', ''), 1, 8)) ||
      '. Funds are expected to arrive within 3–4 working days.',
      '/wallet/withdraw/' || new.id
    );
    return new;
  end if;

  if new.status = old.status then return new; end if;

  case new.status
    when 'processing' then
      v_title := 'Withdrawal Processing';
      v_body  := 'Your withdrawal is currently being processed.';
    when 'completed' then
      v_title := 'Withdrawal Completed';
      v_body  := 'Your withdrawal of ' || v_amount || ' has been completed.';
    when 'failed' then
      v_title := 'Withdrawal Failed';
      v_body  := 'Your withdrawal request could not be completed.' ||
                 -- Only a reason the operator wrote for the user. Provider
                 -- internals are not echoed to the account holder.
                 coalesce(' ' || nullif(trim(new.failure_reason), ''), '') ||
                 ' Any reserved funds have been returned to your balance.';
    when 'rejected' then
      v_title := 'Withdrawal Rejected';
      v_body  := 'Your withdrawal request was rejected.' ||
                 coalesce(' ' || nullif(trim(new.failure_reason), ''), '');
    when 'cancelled' then
      v_title := 'Withdrawal Cancelled';
      v_body  := 'Your withdrawal request was cancelled and the reserved funds ' ||
                 'are available again.';
    else
      return new;
  end case;

  insert into public.notifications (user_id, category, title, body, href)
  values (new.user_id, 'transaction', v_title, v_body,
          '/wallet/withdraw/' || new.id);

  return new;
end;
$$;

drop trigger if exists withdrawals_notify on public.withdrawal_requests;
create trigger withdrawals_notify
  after insert or update of status on public.withdrawal_requests
  for each row execute function public.notify_withdrawal_status();

-- ------------------------------------------------------------------- deposits
create or replace function public.notify_deposit_status()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_title text;
  v_body  text;
  -- `credited_cents` is NULL until the provider settles, so the amount is only
  -- named once there is one. "A deposit" beats "a deposit of $0.00".
  v_amount text := case
    when new.credited_cents is null then null
    else to_char(new.credited_cents / 100.0, 'FM999,999,990.00')
  end;
begin
  if tg_op = 'UPDATE' and new.status = old.status then return new; end if;

  case new.status
    when 'pending' then
      v_title := 'Deposit Pending';
      v_body  := 'A deposit' || coalesce(' of ' || v_amount, '') ||
                 ' has been detected and is awaiting network confirmation.';
    when 'confirmed' then
      v_title := 'Deposit Confirmed';
      v_body  := 'Your deposit' || coalesce(' of ' || v_amount, '') ||
                 ' has been confirmed.';
    when 'credited' then
      v_title := 'Deposit Confirmed';
      v_body  := 'Your deposit' || coalesce(' of ' || v_amount, '') ||
                 ' has been credited to your available balance.';
    when 'failed' then
      v_title := 'Deposit Failed';
      v_body  := 'A deposit could not be credited to your account.';
    else
      -- 'awaiting_funds' is the address being issued, not an event worth a ping.
      return new;
  end case;

  insert into public.notifications (user_id, category, title, body, href)
  values (new.user_id, 'transaction', v_title, v_body, '/wallet/activity');

  return new;
end;
$$;

drop trigger if exists deposits_notify on public.deposits;
create trigger deposits_notify
  after insert or update of status on public.deposits
  for each row execute function public.notify_deposit_status();

-- -------------------------------------------------------- investment payments
-- Fires only on the transition to `paid`, which requires `paid_at` by the
-- `payments_paid_has_timestamp` check. Elapsed time alone can never trigger this:
-- something has to write the row.
create or replace function public.notify_investment_payment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid;
  v_plan text;
begin
  if new.status <> 'paid' then return new; end if;
  if tg_op = 'UPDATE' and old.status = 'paid' then return new; end if;

  select i.user_id, p.name
    into v_user, v_plan
    from public.investments i
    join public.investment_plans p on p.id = i.plan_id
   where i.id = new.investment_id;

  if v_user is null then return new; end if;

  insert into public.notifications (user_id, category, title, body, href)
  values (
    v_user, 'investment', 'Investment Payment Credited',
    'Your scheduled payment for ' || v_plan || ' has been credited. Amount ' ||
    to_char(new.amount_cents / 100.0, 'FM999,999,990.00') || ' · ' ||
    to_char(coalesce(new.paid_at, now()), 'DD/MM/YYYY') || '.',
    '/investments'
  );

  return new;
end;
$$;

drop trigger if exists investment_payments_notify on public.investment_payments;
create trigger investment_payments_notify
  after insert or update of status on public.investment_payments
  for each row execute function public.notify_investment_payment();

-- ---------------------------------------------------------- welcome on signup
-- `handle_new_user` already creates the profile row on signup. Appending the
-- welcome notification there keeps account creation a single atomic event rather
-- than something the client has to remember to do after registering.
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
    -- Unchanged from 0001: a blank name is stored as NULL, not as ''.
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '')
  )
  on conflict (id) do nothing;

  insert into public.user_balances (user_id) values (new.id)
  on conflict (user_id) do nothing;

  insert into public.notifications (user_id, category, title, body, href)
  values (
    new.id, 'account', 'Welcome to TESLA Electronics',
    'Your account has been created successfully.',
    '/dashboard'
  );

  return new;
end;
$$;

-- =============================================================================
-- 6. Authentication notifications
--
-- There is deliberately no INSERT policy on `notifications`, so a client cannot
-- write one directly. These two `security definer` functions are the only opening,
-- and each is deliberately narrow: neither takes a title, a body or a user id, so
-- the *content* of an auth notification cannot be dictated by the caller.
-- =============================================================================

-- Successful sign-in. The user is authenticated by the time this runs, so the
-- subject comes from `auth.uid()` and there is nothing to spoof.
create or replace function public.record_successful_login(p_device text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then return; end if;

  insert into public.notifications (user_id, category, title, body, href)
  values (
    v_user, 'security', 'Successful Login',
    'You successfully signed in to your TESLA Electronics account on ' ||
    to_char(now(), 'DD/MM/YYYY') || ' at ' || to_char(now(), 'HH24:MI') || ' UTC.' ||
    -- Truncated and only ever the user agent string. No IP, no location, no
    -- credential material of any kind.
    coalesce(' Device: ' || nullif(trim(left(p_device, 180)), '') || '.', ''),
    '/profile'
  );
end;
$$;

revoke all on function public.record_successful_login(text) from public;
grant execute on function public.record_successful_login(text) to authenticated;

-- =============================================================================
-- Failed sign-in.
--
-- Callable by `anon` out of necessity: a failed login has no session, so the
-- account cannot be identified from `auth.uid()`. Three things keep that from
-- being a hole:
--
--   · It returns void unconditionally. Whether the email matched an account is
--     never revealed to the caller, so this is not an account-existence oracle.
--   · The caller supplies only an email. It cannot choose the recipient's id, the
--     title or the body.
--   · It is throttled. Without that, an attacker who knows an email address could
--     flood a stranger's notification feed — turning a security feature into a
--     nuisance vector. One failed-login notice per account per 15 minutes is
--     enough to alert a real owner and useless for spamming them.
--
-- The password is never a parameter and is never logged.
-- =============================================================================
create or replace function public.record_failed_login(
  p_email text,
  p_device text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid;
begin
  select id into v_user
    from public.profiles
   where lower(email) = lower(trim(p_email))
   limit 1;

  if v_user is null then return; end if;

  -- Throttle.
  if exists (
    select 1 from public.notifications
     where user_id = v_user
       and title = 'Failed Login Attempt'
       and created_at > now() - interval '15 minutes'
  ) then
    return;
  end if;

  insert into public.notifications (user_id, category, title, body, href)
  values (
    v_user, 'security', 'Failed Login Attempt',
    'A failed login attempt was detected on your account on ' ||
    to_char(now(), 'DD/MM/YYYY') || ' at ' || to_char(now(), 'HH24:MI') || ' UTC.' ||
    coalesce(' Device: ' || nullif(trim(left(p_device, 180)), '') || '.', '') ||
    ' If this was not you, change your password.',
    '/profile'
  );
end;
$$;

revoke all on function public.record_failed_login(text, text) from public;
grant execute on function public.record_failed_login(text, text) to anon, authenticated;

-- --------------------------------------------------------------- realtime feed
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.notifications;
    exception
      when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.withdrawal_requests;
    exception
      when duplicate_object then null;
    end;
  end if;
end $$;

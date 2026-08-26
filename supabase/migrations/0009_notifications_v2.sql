-- =============================================================================
-- TESLA Electronics — notification system v2
--
-- Builds on 0001 (table + RLS) and 0006 (first-generation triggers) to turn the
-- notifications table into the full product: typed categories, JSON metadata,
-- expiry, realtime client state, admin broadcasts and a complete auth-event set.
--
-- Rules this migration follows:
--
--   12.  A notification is a *report* of something the database already recorded.
--        Every trigger fires AFTER the row it describes actually changed, and
--        nothing here ever writes the financial row itself.
--   13.  A failed notification must never fail the thing it reports. Every
--        trigger wraps its insert in a subtransaction that swallows the error
--        and raises a WARNING instead, so a deposit, withdrawal, investment,
--        login or password change succeeds even if a notification row cannot be
--        written.
--   14.  Clients cannot write notifications directly (no INSERT policy), cannot
--        rewrite delivered content (update guard below), and can only mark their
--        own rows read. Admin and self-service creation go through narrow
--        `security definer` functions that derive the recipient from
--        `auth.uid()` or an admin table — never from a client-supplied user id
--        used as proof of anything.
--   15.  Expired notifications are invisible: the SELECT policy hides them, so
--        no page, count or realtime client ever sees an expired row. Purging is
--        an optional maintenance step (`purge_expired_notifications()`), not
--        something the app has to remember to do.
--
-- Idempotent: every statement is written to be re-runnable, matching the
-- convention of 0006–0008.
-- =============================================================================

-- --------------------------------------------------------- 1. the type enum
-- The category enum from 0001 (`notification_category`) is retained because the
-- first-generation rows and several UI parts use it. `notification_type` is the
-- richer, event-specific classification the product now sends; new code should
-- write it and may read `category` as the coarse grouping.
do $$
begin
  if not exists (
    select 1 from pg_type
     where typname = 'notification_type'
       and typnamespace = 'public'::regnamespace
  ) then
    create type public.notification_type as enum (
      'auth',         -- account lifecycle: welcome, verification
      'security',     -- sign-ins, password, email, failed attempts
      'deposit',      -- deposit lifecycle (pending → confirmed → credited)
      'withdrawal',   -- withdrawal lifecycle
      'investment',   -- activation / completion / cancellation
      'profit',       -- a payment period was credited
      'wallet',       -- generic ledger / balance events
      'system',       -- platform notices
      'promotion',    -- marketing (admin only)
      'announcement'  -- platform announcements (admin only)
    );
  end if;
end $$;

-- ------------------------------------------------- 2. table: new columns
alter table public.notifications
  add column if not exists type public.notification_type,
  add column if not exists data jsonb not null default '{}'::jsonb,
  add column if not exists expires_at timestamptz,
  -- Generated, so it can never disagree with read_at. Clients update read_at;
  -- is_read is a read-only projection of it.
  add column if not exists is_read boolean generated always as (read_at is not null) stored,
  -- Compatibility view of `body` for consumers that expect the column to be
  -- named "message". Generated, not duplicated by the app.
  add column if not exists message text generated always as (body) stored;

-- Backfill the type from the coarse category for rows written by 0006, then
-- make it mandatory with a safe default for any future direct insert.
update public.notifications
   set type = case category
     when 'account'     then 'auth'::public.notification_type
     when 'investment'  then 'investment'::public.notification_type
     when 'transaction' then 'wallet'::public.notification_type   -- deposits/withdrawals are indistinguishable in old rows
     when 'security'    then 'security'::public.notification_type
     when 'platform'    then 'system'::public.notification_type
   end
 where type is null;

alter table public.notifications
  alter column type set default 'system',
  alter column type set not null;

-- --------------------------------------------------------------- 3. indexes
-- user_id + created_at is already covered by `notifications_user_idx` (0001).
create index if not exists notifications_created_at_idx
  on public.notifications (created_at desc);

-- The unread index becomes is_read-based (generated) instead of read_at-based.
drop index if exists notifications_unread_idx;
create index if not exists notifications_unread_idx
  on public.notifications (user_id, created_at desc)
  where not is_read;

-- Expiry sweep only needs the rows that can ever expire.
create index if not exists notifications_expires_at_idx
  on public.notifications (expires_at)
  where expires_at is not null;

-- ---------------------------------------------------- 4. update guard trigger
-- The only client-side UPDATE policy is "mark as read"; everything else must be
-- written by a security definer function. This trigger makes that a hard
-- database rule rather than a policy convention: an UPDATE that touches any
-- field other than `read_at` is refused for every role, definer included.
create or replace function public.notifications_guard_update()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.user_id <> old.user_id
     or new.category <> old.category
     or new.type <> old.type
     or new.title <> old.title
     or new.body <> old.body
     or new.href is distinct from old.href
     or new.data is distinct from old.data
     or new.expires_at is distinct from old.expires_at
  then
    raise exception
      'A notification can only be marked as read.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists notifications_guard_update on public.notifications;
create trigger notifications_guard_update
  before update on public.notifications
  for each row execute function public.notifications_guard_update();

-- ----------------------------------------------------------------- 5. RLS
-- Own row, unexpired, read or mark-as-read. There is still no INSERT or DELETE
-- policy: creation is definer-function only.
drop policy if exists "Notifications are readable by their owner"
  on public.notifications;
create policy "Notifications are readable by their owner"
  on public.notifications for select to authenticated
  using (
    auth.uid() = user_id
    and (expires_at is null or expires_at > now())
  );

drop policy if exists "Notifications are markable as read by their owner"
  on public.notifications;
create policy "Notifications are markable as read by their owner"
  on public.notifications for update to authenticated
  using (
    auth.uid() = user_id
    and (expires_at is null or expires_at > now())
  )
  with check (auth.uid() = user_id);

-- Table privileges: the client role only ever reads and marks-as-read. Keep the
-- grants explicit so the migration is self-contained even where Supabase's
-- default privileges are not applied to pre-existing tables.
grant select, update on public.notifications to authenticated;

-- =============================================================================
-- 6. The single write path
--
-- `notify_user` is where every notification row is created. It validates content
-- server-side and stores nothing sensitive: `data` carries ids, amounts,
-- currency and references only — never addresses, hashes, tokens or device
-- strings beyond the truncated UA already in the body of auth events.
-- =============================================================================
create or replace function public.notify_user(
  p_user_id uuid,
  p_type public.notification_type,
  p_title text,
  p_body text,
  p_href text default null,
  p_data jsonb default '{}'::jsonb,
  p_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_title text := nullif(trim(p_title), '');
  v_body  text := nullif(trim(p_body), '');
  v_href  text := nullif(trim(coalesce(p_href, '')), '');
  v_id    uuid;
begin
  if p_user_id is null then
    raise exception 'No recipient' using errcode = 'P0002';
  end if;

  if v_title is null or char_length(v_title) > 120 then
    raise exception 'Notification title must be 1–120 characters'
      using errcode = '22023';
  end if;
  if v_body is null or char_length(v_body) > 2000 then
    raise exception 'Notification body must be 1–2000 characters'
      using errcode = '22023';
  end if;

  -- Deep links are internal paths or explicit https URLs. Anything else — in
  -- particular protocol-relative or javascript: strings — is refused, so a
  -- notification can never smuggle a dangling scheme into the client router.
  if v_href is not null then
    if char_length(v_href) > 300
       or not (v_href like '/%' or v_href like 'https://%')
    then
      raise exception 'Notification link must be an internal path or an https URL'
        using errcode = '22023';
    end if;
  end if;

  if p_expires_at is not null and p_expires_at <= now() then
    raise exception 'Notification expiry must be in the future'
      using errcode = '22023';
  end if;

  insert into public.notifications (
    user_id, category, type, title, body, href, data, expires_at
  )
  values (
    p_user_id,
    -- Explicit cast: a CASE of string literals types as text, and text does not
    -- assign implicitly to an enum column.
    (case p_type
      when 'auth' then 'account'::public.notification_category
      when 'investment' then 'investment'::public.notification_category
      when 'profit' then 'investment'::public.notification_category
      when 'deposit' then 'transaction'::public.notification_category
      when 'withdrawal' then 'transaction'::public.notification_category
      when 'wallet' then 'transaction'::public.notification_category
      when 'security' then 'security'::public.notification_category
      else 'platform'::public.notification_category
    end),
    p_type,
    v_title,
    v_body,
    v_href,
    coalesce(p_data, '{}'::jsonb),
    p_expires_at
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- Internal only. Triggers, auth helper and admin functions call it directly;
-- the client never does.
revoke all on function public.notify_user(
  uuid, public.notification_type, text, text, text, jsonb, timestamptz
) from public;

-- ---------------------------------------------------------- 7. self-service
-- A user may create a notification for *themselves only* — the recipient is
-- always `auth.uid()`, there is no recipient parameter to spoof. Used by
-- server-side service code (`src/lib/notifications/service.ts`) for events that
-- live outside the database triggers. Content is validated by `notify_user`.
create or replace function public.create_notification(
  p_type public.notification_type,
  p_title text,
  p_body text,
  p_href text default null,
  p_data jsonb default '{}'::jsonb,
  p_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Sign in to create notifications' using errcode = '28000';
  end if;

  return public.notify_user(
    v_user, p_type, p_title, p_body, p_href, p_data, p_expires_at
  );
end;
$$;

revoke all on function public.create_notification(
  public.notification_type, text, text, text, jsonb, timestamptz
) from public;
grant execute on function public.create_notification(
  public.notification_type, text, text, text, jsonb, timestamptz
) to authenticated;

-- Batch version: one round trip, still self-only. `p_items` is a JSON array of
-- {type, title, body, href?, data?, expires_at?} objects, validated per item.
create or replace function public.create_notifications(p_items jsonb)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_item jsonb;
  v_count integer := 0;
begin
  if v_user is null then
    raise exception 'Sign in to create notifications' using errcode = '28000';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 50 then
    raise exception 'Notifications batch must be a JSON array of at most 50 items'
      using errcode = '22023';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'Each notification item must be an object' using errcode = '22023';
    end if;

    perform public.notify_user(
      v_user,
      (v_item ->> 'type')::public.notification_type,
      v_item ->> 'title',
      v_item ->> 'body',
      v_item ->> 'href',
      coalesce(v_item -> 'data', '{}'::jsonb),
      nullif(v_item ->> 'expires_at', '')::timestamptz
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.create_notifications(jsonb) from public;
grant execute on function public.create_notifications(jsonb) to authenticated;

-- =============================================================================
-- 8. Admin authorization
--
-- `admins` is an explicit allow-list table — deliberately a table, and not a
-- boolean column on `profiles`: the profile UPDATE policy lets an owner edit
-- their own row, so an `is_admin` column there would be a self-assignable flag.
-- A row in `admins` is only ever written by an operator in SQL.
--
-- RLS is enabled with NO policies: the table is invisible and unwritable to
-- every PostgREST role. Only `security definer` functions running as the owner
-- may read it.
-- =============================================================================
create table if not exists public.admins (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated, public;

create or replace function public.is_admin(p_user uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.admins where user_id = p_user
  );
$$;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated;

-- Resolves a list of account emails to user ids for the admin form. Returns ids
-- only — never email addresses — so the admin UI can name recipients without the
-- database handing out an address list the caller has no policy right to.
create or replace function public.admin_resolve_user_ids(p_emails text[])
returns uuid[]
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ids uuid[];
begin
  if not public.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if p_emails is null or array_length(p_emails, 1) is null then
    return '{}'::uuid[];
  end if;

  select array_agg(distinct id order by id)
    into v_ids
    from public.profiles
   where lower(email) = any (
     select lower(trim(t.email))
       from unnest(p_emails) as t(email)
   );

  return coalesce(v_ids, '{}'::uuid[]);
end;
$$;

revoke all on function public.admin_resolve_user_ids(text[]) from public;
grant execute on function public.admin_resolve_user_ids(text[]) to authenticated;

-- Broadcast: one user, a chosen set of users, or every user. The title, body and
-- type are validated by `notify_user`; `p_user_ids` is required unless
-- `p_all_users` is true, and unknown ids are skipped silently (a deleted account
-- must not fail a platform announcement).
create or replace function public.admin_create_notifications(
  p_type public.notification_type,
  p_title text,
  p_body text,
  p_href text default null,
  p_data jsonb default '{}'::jsonb,
  p_expires_at timestamptz default null,
  p_user_ids uuid[] default null,
  p_all_users boolean default false
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer := 0;
  v_user uuid;
begin
  if not public.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if p_all_users then
    for v_user in select id from public.profiles order by id loop
      perform public.notify_user(
        v_user, p_type, p_title, p_body, p_href, p_data, p_expires_at
      );
      v_count := v_count + 1;
    end loop;
    return v_count;
  end if;

  if p_user_ids is null or array_length(p_user_ids, 1) is null then
    raise exception 'Choose recipients or broadcast to all users'
      using errcode = '22023';
  end if;

  for v_user in
    select distinct id from public.profiles
     where id = any (p_user_ids)
     order by id
  loop
    perform public.notify_user(
      v_user, p_type, p_title, p_body, p_href, p_data, p_expires_at
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.admin_create_notifications(
  public.notification_type, text, text, text, jsonb, timestamptz, uuid[], boolean
) from public;
grant execute on function public.admin_create_notifications(
  public.notification_type, text, text, text, jsonb, timestamptz, uuid[], boolean
) to authenticated;

-- --------------------------------------------------------- 9. expiry cleanup
-- Every read hides expired rows, so this is purely a storage-hygiene job. Run it
-- from pg_cron or an external scheduler if preferred:
--
--   select cron.schedule('purge notifications', '0 3 * * *',
--     $$select public.purge_expired_notifications()$$);
create or replace function public.purge_expired_notifications()
returns integer
language sql
security definer
set search_path = public, pg_temp
as $$
  with deleted as (
    delete from public.notifications
     where expires_at is not null and expires_at <= now()
     returning 1
  )
  select count(*) from deleted;
$$;

revoke all on function public.purge_expired_notifications() from public;

-- =============================================================================
-- 10. Event triggers (0006 v2) — typed, metadata-rich, failure-isolated
--
-- Every function below is `create or replace`d with the same contract as 0006
-- and the same wording; the changes are: the insert goes through `notify_user`
-- (which validates and sets type/data), and the whole notify call is wrapped in
-- a subtransaction so a notification problem can never roll back the financial
-- event it reports (rule 13).
-- =============================================================================

-- ------------------------------------------------------------------ deposits
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
      -- Only a row actually marked `credited` (which requires a settled_at and
      -- a ledger transaction_id, see 0003) can ever say "credited".
      v_title := 'Deposit Successful';
      v_body  := 'Your deposit' || coalesce(' of ' || v_amount, '') ||
                 ' has been successfully credited to your wallet.';
    when 'failed' then
      v_title := 'Deposit Failed';
      v_body  := 'A deposit could not be credited to your account.';
    else
      -- 'awaiting_funds' is the address being issued, not an event worth a ping.
      return new;
  end case;

  begin
    perform public.notify_user(
      new.user_id, 'deposit', v_title, v_body, '/wallet',
      jsonb_build_object(
        'deposit_id', new.id,
        'transaction_id', new.transaction_id,
        'credited_cents', new.credited_cents,
        'currency', 'USD'
      )
    );
  exception when others then
    raise warning 'notify_deposit_status: notification insert failed: %', sqlerrm;
  end;

  return new;
end;
$$;

drop trigger if exists deposits_notify on public.deposits;
create trigger deposits_notify
  after insert or update of status on public.deposits
  for each row execute function public.notify_deposit_status();

-- ---------------------------------------------------------------- withdrawals
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
  v_data  jsonb := jsonb_build_object(
    'withdrawal_id', new.id,
    'transaction_id', new.transaction_id,
    'amount_cents', new.amount_cents,
    'currency', 'USD',
    'reference', upper(substr(replace(new.id::text, '-', ''), 1, 8))
  );
begin
  if tg_op = 'INSERT' then
    -- Submitted, not sent. The wording carries that distinction deliberately.
    begin
      perform public.notify_user(
        new.user_id, 'withdrawal', 'Withdrawal Request Received',
        'Your withdrawal request of ' || v_amount ||
        ' has been received and is being processed. Reference ' ||
        v_data ->> 'reference' || '. Funds are expected to arrive within 3–4 working days.',
        '/wallet/withdraw/' || new.id, v_data
      );
    exception when others then
      raise warning 'notify_withdrawal_status: notification insert failed: %', sqlerrm;
    end;
    return new;
  end if;

  if new.status = old.status then return new; end if;

  case new.status
    when 'processing' then
      v_title := 'Withdrawal Processing';
      v_body  := 'Your withdrawal is currently being processed.';
    when 'completed' then
      v_title := 'Withdrawal Completed';
      v_body  := 'Your withdrawal of ' || v_amount ||
                 ' has been successfully processed.';
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

  begin
    perform public.notify_user(
      new.user_id, 'withdrawal', v_title, v_body,
      '/wallet/withdraw/' || new.id,
      v_data || jsonb_build_object('failure_reason', new.failure_reason)
    );
  exception when others then
    raise warning 'notify_withdrawal_status: notification insert failed: %', sqlerrm;
  end;

  return new;
end;
$$;

drop trigger if exists withdrawals_notify on public.withdrawal_requests;
create trigger withdrawals_notify
  after insert or update of status on public.withdrawal_requests
  for each row execute function public.notify_withdrawal_status();

-- --------------------------------------------------------- investment payment
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

  begin
    perform public.notify_user(
      v_user, 'profit', 'Profit Credited',
      format('%s profit has been credited from your investment.',
             to_char(new.amount_cents / 100.0, 'FM999,999,990.00')),
      '/investments',
      jsonb_build_object(
        'investment_id', new.investment_id,
        'payment_id', new.id,
        'amount_cents', new.amount_cents,
        'currency', new.currency,
        'period_index', new.period_index
      )
    );
  exception when others then
    raise warning 'notify_investment_payment: notification insert failed: %', sqlerrm;
  end;

  return new;
end;
$$;

drop trigger if exists investment_payments_notify on public.investment_payments;
create trigger investment_payments_notify
  after insert or update of status on public.investment_payments
  for each row execute function public.notify_investment_payment();

-- ------------------------------------------------------------------- welcome
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

  begin
    perform public.notify_user(
      new.id, 'auth', 'Welcome to TESLA Electronics',
      'Your account has been created successfully. Welcome aboard!',
      '/dashboard'
    );
  exception when others then
    raise warning 'handle_new_user: welcome notification failed: %', sqlerrm;
  end;

  return new;
end;
$$;

-- ------------------------------------------------------- successful sign-in
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

  begin
    perform public.notify_user(
      v_user, 'security', 'New Login Detected',
      'You successfully logged into your account on ' ||
      to_char(now(), 'DD/MM/YYYY') || ' at ' || to_char(now(), 'HH24:MI') || ' UTC.' ||
      -- Truncated and only ever the user agent string. No IP, no location, no
      -- credential material of any kind.
      coalesce(' Device: ' || nullif(trim(left(p_device, 180)), '') || '.', ''),
      '/profile#security',
      jsonb_build_object(
        'login_at', now(),
        'device', nullif(left(trim(coalesce(p_device, '')), 180), '')
      )
    );
  exception when others then
    raise warning 'record_successful_login: notification failed: %', sqlerrm;
  end;
end;
$$;

revoke all on function public.record_successful_login(text) from public;
grant execute on function public.record_successful_login(text) to authenticated;

-- -------------------------------------------------------------- failed sign-in
-- Callable by `anon` out of necessity: a failed login has no session, so the
-- account cannot be identified from `auth.uid()`. Three things keep that from
-- being a hole:
--
--   · It returns void unconditionally. Whether the email matched an account is
--     never revealed to the caller, so this is not an account-existence oracle.
--   · The caller supplies only an email. It cannot choose the recipient's id,
--     the title or the body.
--   · It is throttled — one notice per account per 15 minutes.
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

  begin
    perform public.notify_user(
      v_user, 'security', 'Failed Login Attempt',
      'A failed login attempt was detected on your account on ' ||
      to_char(now(), 'DD/MM/YYYY') || ' at ' || to_char(now(), 'HH24:MI') || ' UTC.' ||
      coalesce(' Device: ' || nullif(trim(left(p_device, 180)), '') || '.', '') ||
      ' If this was not you, change your password.',
      '/profile#security',
      jsonb_build_object('attempted_at', now())
    );
  exception when others then
    raise warning 'record_failed_login: notification failed: %', sqlerrm;
  end;
end;
$$;

revoke all on function public.record_failed_login(text, text) from public;
grant execute on function public.record_failed_login(text, text) to anon, authenticated;

-- ------------------------------------------------- 11. password reset request
-- The same shape as `record_failed_login`: called when reset mail is sent (by
-- the forgot-password page, where there is no session), throttled, and
-- non-revealing. The *change* itself is reported by the `auth.users` trigger
-- below, so "requested" and "changed" are always distinct events.
create or replace function public.record_password_reset_requested(
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

  if exists (
    select 1 from public.notifications
     where user_id = v_user
       and title = 'Password Reset Requested'
       and created_at > now() - interval '15 minutes'
  ) then
    return;
  end if;

  begin
    perform public.notify_user(
      v_user, 'security', 'Password Reset Requested',
      'A password reset was requested for your account on ' ||
      to_char(now(), 'DD/MM/YYYY') || ' at ' || to_char(now(), 'HH24:MI') || ' UTC.' ||
      ' If you did not request this, secure your account immediately.',
      '/profile#security',
      jsonb_build_object('requested_at', now())
    );
  exception when others then
    raise warning 'record_password_reset_requested: notification failed: %', sqlerrm;
  end;
end;
$$;

revoke all on function public.record_password_reset_requested(text, text) from public;
grant execute on function public.record_password_reset_requested(text, text)
  to anon, authenticated;

-- =============================================================================
-- 12. Auth security events, from the source of truth
--
-- `auth.users` is updated by Supabase Auth itself for password changes, email
-- changes and email verification, so the trigger below cannot be missed by an
-- application code path — and a notification failure is swallowed so it can
-- never block the credential change it reports.
-- =============================================================================
create or replace function public.notify_auth_security_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- A password was actually changed (reset link used, or account update).
  if old.encrypted_password is distinct from new.encrypted_password then
    begin
      perform public.notify_user(
        new.id, 'security', 'Password Changed',
        'Your account password was successfully changed. If you did not make ' ||
        'this change, secure your account immediately.',
        '/profile#security',
        jsonb_build_object('occurred_at', now())
      );
    exception when others then
      raise warning 'notify_auth_security_event: password notice failed: %', sqlerrm;
    end;
  end if;

  -- Email verification is a one-way event; re-confirmation must not re-ping.
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    begin
      perform public.notify_user(
        new.id, 'auth', 'Email Verified',
        'Your email address has been verified successfully.',
        '/profile',
        jsonb_build_object('verified_at', new.email_confirmed_at)
      );
    exception when others then
      raise warning 'notify_auth_security_event: verification notice failed: %', sqlerrm;
    end;
  end if;

  -- Email address changed (post-confirmation of the new address, which is when
  -- `email` itself is replaced by Supabase Auth).
  if old.email is distinct from new.email then
    begin
      perform public.notify_user(
        new.id, 'security', 'Email Changed',
        'Your account email address was changed. If you did not make this ' ||
        'change, contact support immediately.',
        '/profile',
        jsonb_build_object('changed_at', now())
      );
    exception when others then
      raise warning 'notify_auth_security_event: email notice failed: %', sqlerrm;
    end;
  end if;

  return new;
end;
$$;

drop trigger if exists auth_users_notify_security on auth.users;
create trigger auth_users_notify_security
  after update on auth.users
  for each row execute function public.notify_auth_security_event();

-- =============================================================================
-- 13. Investment activation (0006 v2)
--
-- Identical contract to 0006 — the same checks, writes and schedule — with one
-- change: the confirmation notification goes through `notify_user` (typed, with
-- the ledger reference in metadata) and its failure cannot roll the activation
-- back.
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
  -- `reference` is also the name of this function's OUT column, so the
  -- RETURNING reference must be table-qualified or PL/pgSQL rejects the
  -- statement as ambiguous (SQLSTATE 42702).
  returning transactions.reference into v_txn_ref;

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

  -- Report after the row and the debit both exist, and never let this notice
  -- roll back a successfully activated investment.
  begin
    perform public.notify_user(
      v_user, 'investment', 'Investment Activated',
      'Your ' || v_plan.name || ' investment is now active. ' ||
      'Amount ' || to_char(v_plan.investment_amount_cents / 100.0, 'FM999,999,990.00') ||
      ' · started ' || to_char(v_started, 'DD/MM/YYYY') ||
      ' · expected completion ' || to_char(v_matures, 'DD/MM/YYYY') || '.',
      '/investments',
      jsonb_build_object(
        'investment_id', v_investment,
        'plan_id', v_plan.id,
        'amount_cents', v_plan.investment_amount_cents,
        'currency', 'USD',
        'reference', v_txn_ref
      )
    );
  exception when others then
    raise warning 'activate_investment: notification insert failed: %', sqlerrm;
  end;

  return query select v_investment, v_txn_ref;
end;
$$;

revoke all on function public.activate_investment(uuid) from public;
grant execute on function public.activate_investment(uuid) to authenticated;

-- ------------------------------------------------------------- 14. realtime
-- `notifications` and `withdrawal_requests` were published by 0006. Re-assert
-- both so this migration is self-contained if applied on a fresh project first.
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

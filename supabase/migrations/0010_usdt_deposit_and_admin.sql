-- =============================================================================
-- Migration 0010: USDT Deposit Flow, Idempotent Admin Review & Storage
--
-- Features:
--   1. Deposit status enum extended for full review lifecycle:
--      'pending', 'pending_review', 'approved', 'declined', 'expired', 'cancelled'.
--   2. payment_methods configured for USDT deposits on BEP-20 (BSC) & ERC-20 (Ethereum).
--   3. deposits table enhanced with references, expiration, receipt paths, review audits.
--   4. Admin role assignment for user f91a9db9-8f13-4759-9b10-a0cdf385e7d4.
--   5. Security definer RPCs for creating deposits, submitting receipts, idempotent admin approval, and decline.
--   6. Private deposit-receipts Supabase Storage bucket configuration with RLS.
-- =============================================================================

-- ----------------------------------------------------------------- 1. Enum values
alter type public.deposit_status add value if not exists 'pending_review';
alter type public.deposit_status add value if not exists 'approved';
alter type public.deposit_status add value if not exists 'declined';
alter type public.deposit_status add value if not exists 'expired';
alter type public.deposit_status add value if not exists 'cancelled';

-- ----------------------------------------------------------- 2. Payment methods & settings
-- Enable deposits exclusively on USDT BEP-20 (bsc) and USDT ERC-20 (ethereum).
-- All other assets (USDC, TRX) and networks remain deposit_enabled = false.
update public.payment_methods
   set deposit_enabled = true
 where id in ('usdt-bsc', 'usdt-ethereum');

update public.payment_methods
   set deposit_enabled = false
 where id not in ('usdt-bsc', 'usdt-ethereum');

insert into public.platform_settings (key, value)
values ('deposits_enabled', 'true'::jsonb)
on conflict (key) do update set value = 'true'::jsonb, updated_at = now();

insert into public.platform_settings (key, value)
values ('minimum_deposit_cents', '100000'::jsonb), -- 1,000 USDT ($1,000.00)
       ('maximum_deposit_cents', '5000000'::jsonb) -- 50,000 USDT ($50,000.00)
on conflict (key) do update set value = excluded.value, updated_at = now();

-- ----------------------------------------------------------- 3. Deposits table columns
alter table public.deposits
  add column if not exists reference text,
  add column if not exists amount_cents bigint,
  add column if not exists receiving_address text,
  add column if not exists expires_at timestamptz,
  add column if not exists receipt_url text,
  add column if not exists receipt_path text,
  add column if not exists receipt_submitted_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references public.profiles(id),
  add column if not exists rejection_reason text,
  add column if not exists updated_at timestamptz not null default now();

-- Reference constraint and index
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'deposits_reference_unique'
  ) then
    alter table public.deposits add constraint deposits_reference_unique unique (reference);
  end if;
end $$;

create index if not exists deposits_expires_at_idx on public.deposits (expires_at);
create index if not exists deposits_reference_idx on public.deposits (reference);
create index if not exists deposits_user_status_idx on public.deposits (user_id, status);

-- ----------------------------------------------------------- 4. Admin authorization
-- Assign the specified admin user ID
insert into public.admins (user_id)
values ('f91a9db9-8f13-4759-9b10-a0cdf385e7d4'::uuid)
on conflict do nothing;

create or replace function public.is_admin(p_user uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.admins where user_id = p_user
  ) or p_user = 'f91a9db9-8f13-4759-9b10-a0cdf385e7d4'::uuid;
$$;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated;

-- ----------------------------------------------------------- 5. Storage bucket
-- Create private bucket for deposit receipts if not exists
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'deposit-receipts',
  'deposit-receipts',
  false,
  10485760, -- 10MB limit
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- Storage RLS
create policy "Users can upload their own deposit receipts"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'deposit-receipts'
    and (auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "Users can view their own deposit receipts"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'deposit-receipts'
    and (
      (auth.uid())::text = (storage.foldername(name))[1]
      or public.is_admin()
    )
  );

-- ----------------------------------------------------------- 6. Deposit RPCs

-- Create a new pending deposit request (1-hour countdown)
create or replace function public.create_deposit_request(
  p_method_id text,
  p_amount_cents bigint
)
returns public.deposits
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_method public.payment_methods;
  v_network public.payment_networks;
  v_receiving_address text := '0xDBC37A710fc680A8f511e71A7933E1c2d2C54531';
  v_reference text;
  v_deposit public.deposits;
  v_min_cents bigint := 100000;   -- 1,000 USDT ($1,000.00)
  v_max_cents bigint := 5000000;  -- 50,000 USDT ($50,000.00)
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  if p_method_id not in ('usdt-bsc', 'usdt-ethereum') then
    raise exception 'Unsupported payment method for deposit: %', p_method_id
      using errcode = '22023';
  end if;

  if p_amount_cents < v_min_cents then
    raise exception 'Deposit amount is below minimum of 1,000 USDT'
      using errcode = '22023';
  end if;

  if p_amount_cents > v_max_cents then
    raise exception 'Deposit amount exceeds maximum of 50,000 USDT'
      using errcode = '22023';
  end if;

  select * into v_method from public.payment_methods where id = p_method_id;
  if v_method.id is null or not v_method.deposit_enabled then
    raise exception 'Deposits are not enabled for %', p_method_id
      using errcode = 'P0001';
  end if;

  -- Generate unique reference: e.g. DEP-A1B2C3D4
  v_reference := 'DEP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.deposits (
    user_id,
    method_id,
    asset_amount,
    amount_cents,
    receiving_address,
    reference,
    status,
    expires_at,
    created_at,
    updated_at
  )
  values (
    v_user,
    p_method_id,
    (p_amount_cents / 100.0)::numeric(38, 18),
    p_amount_cents,
    v_receiving_address,
    v_reference,
    'pending',
    now() + interval '1 hour',
    now(),
    now()
  )
  returning * into v_deposit;

  return v_deposit;
end;
$$;

revoke all on function public.create_deposit_request(text, bigint) from public;
grant execute on function public.create_deposit_request(text, bigint) to authenticated;

-- Submit receipt for a pending deposit
create or replace function public.submit_deposit_receipt(
  p_deposit_id uuid,
  p_receipt_path text,
  p_receipt_url text default null
)
returns public.deposits
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_deposit public.deposits;
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select * into v_deposit
    from public.deposits
   where id = p_deposit_id and user_id = v_user
   for update;

  if v_deposit.id is null then
    raise exception 'Deposit request not found' using errcode = 'P0002';
  end if;

  if v_deposit.status <> 'pending' then
    raise exception 'Deposit is not pending (status: %)', v_deposit.status
      using errcode = 'P0001';
  end if;

  if v_deposit.expires_at is not null and v_deposit.expires_at < now() then
    update public.deposits
       set status = 'expired', updated_at = now()
     where id = p_deposit_id;
    raise exception 'Deposit request has expired' using errcode = 'P0001';
  end if;

  update public.deposits
     set status = 'pending_review',
         receipt_path = p_receipt_path,
         receipt_url = coalesce(p_receipt_url, p_receipt_path),
         receipt_submitted_at = now(),
         updated_at = now()
   where id = p_deposit_id
   returning * into v_deposit;

  -- Create notification for user
  insert into public.notifications (user_id, category, type, title, body, href)
  values (
    v_user,
    'transaction',
    'transaction',
    'Payment Pending Review',
    'Your payment proof has been submitted successfully and is pending review.',
    '/wallet'
  );

  return v_deposit;
end;
$$;

revoke all on function public.submit_deposit_receipt(uuid, text, text) from public;
grant execute on function public.submit_deposit_receipt(uuid, text, text) to authenticated;

-- Cancel a pending deposit
create or replace function public.cancel_deposit(p_deposit_id uuid)
returns public.deposits
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_deposit public.deposits;
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select * into v_deposit
    from public.deposits
   where id = p_deposit_id and user_id = v_user
   for update;

  if v_deposit.id is null then
    raise exception 'Deposit request not found' using errcode = 'P0002';
  end if;

  if v_deposit.status not in ('pending', 'pending_review') then
    raise exception 'Deposit cannot be cancelled in state %', v_deposit.status
      using errcode = 'P0001';
  end if;

  update public.deposits
     set status = 'cancelled',
         updated_at = now()
   where id = p_deposit_id
   returning * into v_deposit;

  return v_deposit;
end;
$$;

revoke all on function public.cancel_deposit(uuid) from public;
grant execute on function public.cancel_deposit(uuid) to authenticated;

-- ----------------------------------------------------------- 7. Admin approval and decline

-- Admin Approve Deposit (Idempotent)
create or replace function public.admin_approve_deposit(p_deposit_id uuid)
returns public.deposits
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin uuid := auth.uid();
  v_deposit public.deposits;
  v_method public.payment_methods;
  v_network public.payment_networks;
  v_txn_id uuid;
  v_amount_cents bigint;
  v_formatted_amount text;
begin
  if not public.is_admin(v_admin) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select * into v_deposit
    from public.deposits
   where id = p_deposit_id
   for update;

  if v_deposit.id is null then
    raise exception 'Deposit request not found' using errcode = 'P0002';
  end if;

  -- Idempotency check: if already approved/credited, return existing row without crediting again
  if v_deposit.status in ('approved', 'credited') then
    return v_deposit;
  end if;

  if v_deposit.status not in ('pending_review', 'pending') then
    raise exception 'Deposit is in state % and cannot be approved', v_deposit.status
      using errcode = 'P0001';
  end if;

  if v_deposit.receipt_path is null and v_deposit.receipt_url is null then
    raise exception 'Deposit has no receipt attached' using errcode = 'P0001';
  end if;

  v_amount_cents := coalesce(v_deposit.amount_cents, (v_deposit.asset_amount * 100)::bigint);
  if v_amount_cents is null or v_amount_cents <= 0 then
    raise exception 'Invalid deposit amount' using errcode = '22023';
  end if;

  select * into v_method from public.payment_methods where id = v_deposit.method_id;
  select * into v_network from public.payment_networks where id = v_method.network_id;

  v_formatted_amount := to_char(v_amount_cents / 100.0, 'FM999,999,990.00');

  -- Create completed transaction ledger row (triggers recalculate_user_balance to credit wallet)
  insert into public.transactions (
    user_id,
    type,
    status,
    amount_cents,
    currency,
    reference,
    description,
    settled_at
  )
  values (
    v_deposit.user_id,
    'deposit',
    'completed',
    v_amount_cents,
    'USD',
    coalesce(v_deposit.reference, 'DEP-' || upper(substr(replace(v_deposit.id::text, '-', ''), 1, 8))),
    'USDT Deposit (' || coalesce(v_network.protocol, 'Crypto') || ')',
    now()
  )
  returning id into v_txn_id;

  -- Update deposit row
  update public.deposits
     set status = 'approved',
         credited_cents = v_amount_cents,
         transaction_id = v_txn_id,
         settled_at = now(),
         reviewed_at = now(),
         reviewed_by = v_admin,
         updated_at = now()
   where id = p_deposit_id
   returning * into v_deposit;

  -- Notify user
  insert into public.notifications (user_id, category, type, title, body, href)
  values (
    v_deposit.user_id,
    'transaction',
    'transaction',
    'Deposit Confirmed',
    'Your deposit of ' || v_formatted_amount || ' USDT has been approved and credited to your available balance.',
    '/wallet/activity'
  );

  return v_deposit;
end;
$$;

revoke all on function public.admin_approve_deposit(uuid) from public;
grant execute on function public.admin_approve_deposit(uuid) to authenticated;

-- Admin Decline Deposit
create or replace function public.admin_decline_deposit(
  p_deposit_id uuid,
  p_reason text
)
returns public.deposits
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin uuid := auth.uid();
  v_deposit public.deposits;
begin
  if not public.is_admin(v_admin) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'Decline reason is required' using errcode = '22023';
  end if;

  select * into v_deposit
    from public.deposits
   where id = p_deposit_id
   for update;

  if v_deposit.id is null then
    raise exception 'Deposit request not found' using errcode = 'P0002';
  end if;

  if v_deposit.status in ('approved', 'credited') then
    raise exception 'Cannot decline an already approved deposit' using errcode = 'P0001';
  end if;

  update public.deposits
     set status = 'declined',
         rejection_reason = trim(p_reason),
         reviewed_at = now(),
         reviewed_by = v_admin,
         updated_at = now()
   where id = p_deposit_id
   returning * into v_deposit;

  -- Notify user
  insert into public.notifications (user_id, category, type, title, body, href)
  values (
    v_deposit.user_id,
    'transaction',
    'transaction',
    'Deposit Declined',
    'Your deposit request was declined. Reason: ' || trim(p_reason) || '.',
    '/wallet'
  );

  return v_deposit;
end;
$$;

revoke all on function public.admin_decline_deposit(uuid, text) from public;
grant execute on function public.admin_decline_deposit(uuid, text) to authenticated;

-- ----------------------------------------------------------- 8. Admin deposit queries
-- Allow admins to view all deposits with user details
create or replace function public.admin_get_deposits(p_status text default null)
returns table (
  id uuid,
  user_id uuid,
  user_email text,
  user_full_name text,
  method_id text,
  asset_symbol text,
  network_name text,
  network_protocol text,
  amount_cents bigint,
  asset_amount numeric,
  credited_cents bigint,
  receiving_address text,
  reference text,
  status public.deposit_status,
  receipt_url text,
  receipt_path text,
  receipt_submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid,
  rejection_reason text,
  expires_at timestamptz,
  created_at timestamptz,
  settled_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  return query
  select
    d.id,
    d.user_id,
    p.email as user_email,
    p.full_name as user_full_name,
    d.method_id,
    m.asset_symbol,
    n.name as network_name,
    n.protocol as network_protocol,
    coalesce(d.amount_cents, (d.asset_amount * 100)::bigint) as amount_cents,
    d.asset_amount,
    d.credited_cents,
    d.receiving_address,
    d.reference,
    d.status,
    d.receipt_url,
    d.receipt_path,
    d.receipt_submitted_at,
    d.reviewed_at,
    d.reviewed_by,
    d.rejection_reason,
    d.expires_at,
    d.created_at,
    d.settled_at
  from public.deposits d
  join public.profiles p on p.id = d.user_id
  join public.payment_methods m on m.id = d.method_id
  join public.payment_networks n on n.id = m.network_id
  where (p_status is null or d.status::text = p_status)
  order by d.created_at desc;
end;
$$;

revoke all on function public.admin_get_deposits(text) from public;
grant execute on function public.admin_get_deposits(text) to authenticated;

-- ----------------------------------------------------------- 9. RLS Policy updates for deposits
-- Allow admins to select all deposits
drop policy if exists "Admins can view all deposits" on public.deposits;
create policy "Admins can view all deposits"
  on public.deposits for select to authenticated
  using (public.is_admin());

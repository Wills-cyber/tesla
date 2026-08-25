-- =============================================================================
-- Migration 0015: Expirable deposits are marked expired in a committable step
--
-- The expired branch of `submit_deposit_receipt` used to
--
--     update deposits set status = 'expired' ...;
--     raise exception 'Deposit request has expired';
--
-- inside ONE transaction. The RAISE rolls the transaction back — including
-- the UPDATE — so the row silently stayed `pending` after the window closed.
--
-- The fix splits the two concerns, because one PL/pgSQL transaction cannot
-- both commit a state change and raise:
--
--   1. `expire_stale_deposit(p_deposit_id)` — owner-only, security definer,
--      separate top-level call (= separate transaction): transitions
--      `pending → expired` when `expires_at` is in the past, and commits.
--   2. `admin_get_deposits` sweeps stale `pending` rows up front, so the
--      admin queue always shows the true state after a refresh.
--
-- `submit_deposit_receipt` keeps the user-facing exception (that is the
-- correct behaviour for the submit attempt) and no longer carries the
-- self-rolling update.
-- =============================================================================

-- ------------------------------------------------- expire_stale_deposit
create or replace function public.expire_stale_deposit(p_deposit_id uuid)
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

  if v_deposit.status = 'pending'
     and v_deposit.expires_at is not null
     and v_deposit.expires_at < now() then
    update public.deposits
       set status = 'expired', updated_at = now()
     where id = p_deposit_id
     returning * into v_deposit;
  end if;

  return v_deposit;
end;
$$;

revoke all on function public.expire_stale_deposit(uuid) from public;
grant execute on function public.expire_stale_deposit(uuid) to authenticated;

-- ------------------------------------ submit_deposit_receipt (no dead update)
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
  v_path_parts text[];
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  -- A caller may invoke this RPC directly, so do not rely on browser upload
  -- code to enforce the Storage path. Bucket name is deliberately excluded:
  -- Supabase Storage receives paths relative to `deposit-receipts`.
  v_path_parts := regexp_split_to_array(p_receipt_path, '/');
  if p_receipt_path is null
     or array_length(v_path_parts, 1) <> 3
     or v_path_parts[1] <> v_user::text
     or v_path_parts[2] <> p_deposit_id::text
     or v_path_parts[3] !~ '^receipt-[A-Za-z0-9-]+\.(jpg|jpeg|png|webp|pdf)$' then
    raise exception 'Invalid receipt storage path' using errcode = '22023';
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
    -- This attempt fails; marking the row `expired` happens through
    -- expire_stale_deposit() in its own transaction (see migration 0015).
    raise exception 'Deposit request has expired' using errcode = 'P0001';
  end if;

  update public.deposits
     set status = 'pending_review',
         receipt_path = p_receipt_path,
         -- This bucket is private. Retain no URL that can be confused with a
         -- public link; admins sign receipt_path only after authorization.
         receipt_url = null,
         receipt_submitted_at = now(),
         updated_at = now()
   where id = p_deposit_id
   returning * into v_deposit;

  -- Notification is a report of the change above, never part of it.
  begin
    insert into public.notifications (user_id, category, type, title, body, href)
    values (
      v_user,
      'transaction',
      'deposit',
      'Payment Pending Review',
      'Your payment proof has been submitted successfully and is pending review.',
      '/wallet'
    );
  exception when others then
    raise warning 'submit_deposit_receipt: notification insert failed: %', sqlerrm;
  end;

  return v_deposit;
end;
$$;

revoke all on function public.submit_deposit_receipt(uuid, text, text) from public;
grant execute on function public.submit_deposit_receipt(uuid, text, text) to authenticated;

-- --------------------------------------------------- admin_get_deposits
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

  -- Sweep the queue first: a `pending` row whose proof window has closed is
  -- reported as expired the moment an admin looks, so a refresh never shows
  -- a stale "pending payment" row. (This statement can commit: nothing after
  -- it raises on those rows.) Every column is table-qualified because this
  -- function's OUTPUT columns (status, expires_at, ...) are also in scope
  -- as PL/pgSQL variables and would make bare references ambiguous.
  update public.deposits
     set status = 'expired', updated_at = now()
   where deposits.status = 'pending'
     and deposits.expires_at is not null
     and deposits.expires_at < now();

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

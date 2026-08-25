-- =============================================================================
-- Migration 0014: Fix the notification type in the deposit lifecycle RPCs
--
-- ROOT CAUSE of "receipt uploaded but never attached to the deposit request":
--
--   `submit_deposit_receipt`, `admin_approve_deposit` and
--   `admin_decline_deposit` all inserted
--
--       insert into notifications (user_id, category, type, ...)
--       values (..., 'transaction', 'transaction', ...)
--
--   but `notifications.type` is the `notification_type` enum (migration 0009),
--   whose members are auth/security/deposit/withdrawal/investment/profit/
--   wallet/system/promotion/announcement — there is NO 'transaction' member.
--   ('transaction' only exists on the coarse `category` enum.)
--
--   The enum violation raised inside the RPC aborted the whole transaction,
--   so the receipt path was never stored and the deposit never left
--   `pending` — even though the Storage upload itself had succeeded. The
--   same defect also made every admin approval and decline fail.
--
-- This replaces the three functions with:
--   1. `type = 'deposit'` (the deposit-lifecycle member, per the 0009 comment
--      "deposit — deposit lifecycle (pending → confirmed → credited)"),
--      while `category` stays 'transaction' (valid member of the coarse enum).
--   2. The notification insert is wrapped in an exception-guarded
--      subtransaction (rule 13 from migration 0009): a notification problem
--      can never roll back the financial operation it reports.
--
-- Everything else — authorization, state guards, path validation, ledger
-- credit, idempotency, audit fields — is byte-for-byte the existing logic.
-- =============================================================================

-- ------------------------------------------------- submit_deposit_receipt
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
    update public.deposits set status = 'expired', updated_at = now()
      where id = p_deposit_id;
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

-- --------------------------------------------------- admin_approve_deposit
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

  begin
    insert into public.notifications (user_id, category, type, title, body, href)
    values (
      v_deposit.user_id,
      'transaction',
      'deposit',
      'Deposit Confirmed',
      'Your deposit of ' || v_formatted_amount || ' USDT has been approved and credited to your available balance.',
      '/wallet/activity'
    );
  exception when others then
    raise warning 'admin_approve_deposit: notification insert failed: %', sqlerrm;
  end;

  return v_deposit;
end;
$$;

revoke all on function public.admin_approve_deposit(uuid) from public;
grant execute on function public.admin_approve_deposit(uuid) to authenticated;

-- -------------------------------------------------- admin_decline_deposit
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

  -- Only unreviewed requests can be declined. Anything else already has a
  -- terminal (or reviewed) state that must not be overwritten.
  if v_deposit.status not in ('pending', 'pending_review') then
    raise exception
      'Deposit is in state % and cannot be declined', v_deposit.status
      using errcode = 'P0001';
  end if;

  update public.deposits
     set status = 'declined',
         rejection_reason = trim(p_reason),
         reviewed_at = now(),
         reviewed_by = v_admin,
         updated_at = now()
   where id = p_deposit_id
   returning * into v_deposit;

  begin
    insert into public.notifications (user_id, category, type, title, body, href)
    values (
      v_deposit.user_id,
      'transaction',
      'deposit',
      'Deposit Declined',
      'Your deposit request was declined. Reason: ' || trim(p_reason) || '.',
      '/wallet'
    );
  exception when others then
    raise warning 'admin_decline_deposit: notification insert failed: %', sqlerrm;
  end;

  return v_deposit;
end;
$$;

revoke all on function public.admin_decline_deposit(uuid, text) from public;
grant execute on function public.admin_decline_deposit(uuid, text) to authenticated;

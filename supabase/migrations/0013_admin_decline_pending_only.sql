-- =============================================================================
-- Migration 0013: Admin decline is only valid for actionable requests
--
-- `admin_decline_deposit` previously declined any row that was not yet
-- approved/credited. That let an operator rewrite the terminal audit state of
-- an `expired`, `cancelled` or already `declined` request. Declining is now
-- restricted to the states the review queue actually acts on:
-- `pending` and `pending_review`.
--
-- Everything else (authorization, reason requirement, audit fields, user
-- notification) is unchanged. This replaces the existing function — no new
-- tables, no new columns.
-- =============================================================================

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
  -- terminal (or reviewed) state that must not be overwritten:
  --   approved / credited → would rewrite a settled financial audit
  --   expired / cancelled → would hide how the request actually ended
  --   declined            → already declined; re-declining is not an action
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

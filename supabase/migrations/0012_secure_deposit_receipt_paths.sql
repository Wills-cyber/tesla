-- =============================================================================
-- Migration 0012: Bind deposit receipt records to their private Storage objects
--
-- `receipt_path` is the canonical value: the path inside the private
-- `deposit-receipts` bucket, exactly `{user_id}/{deposit_id}/{filename}`.
-- Never persist a public Storage URL for this bucket.
-- =============================================================================

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

  insert into public.notifications (user_id, category, type, title, body, href)
  values (
    v_user, 'transaction', 'transaction', 'Payment Pending Review',
    'Your payment proof has been submitted successfully and is pending review.',
    '/wallet'
  );

  return v_deposit;
end;
$$;

revoke all on function public.submit_deposit_receipt(uuid, text, text) from public;
grant execute on function public.submit_deposit_receipt(uuid, text, text) to authenticated;

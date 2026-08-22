-- =============================================================================
-- TESLA Electronics — withdrawal experience
--
-- Extends 0003 with everything the full withdrawal flow needs. The rules from
-- 0003 continue to hold; three more are added:
--
--   9.  A withdrawal records the *quote it was priced against*, not just the
--       amount. The exchange rate, the service fee and the total deducted are
--       stored on the row, so a completed payout can always be reconciled
--       against the number the user was shown. Nothing is recomputed later from
--       a rate that has since moved.
--  10.  Fee policy is DATA, not code. `withdrawal_service_fee_bps` and
--       `maximum_withdrawal_cents` live in `platform_settings`. A NULL maximum
--       means "no maximum", and the UI must show nothing rather than invent a
--       ceiling. A service fee of 0 means the platform charges none — which is
--       the honest default until one is actually configured.
--  11.  A saved destination address is written ONLY by its owner, ONLY through an
--       explicit action, and is never a substitute for the confirmation step. The
--       address stored is the exact string the user entered — the insert policy
--       re-checks the format for the chain, and nothing normalises or trims it
--       beyond the leading/trailing whitespace the client already removed.
-- =============================================================================

-- ------------------------------------------------------------ status: cancelled
-- A user (or an operator) can withdraw a request before the provider picks it
-- up. That is a distinct outcome from `failed` and `rejected`: nothing went
-- wrong and nobody refused it, so it must not be reported as a failure.
alter type public.withdrawal_status add value if not exists 'cancelled';

-- ----------------------------------------------------- withdrawal_requests: fees
-- The full money breakdown, captured at submission time.
--
-- `amount_cents` (already present) is what the user asked to withdraw.
-- `service_fee_cents` is the platform's own fee, 0 when none is configured.
-- `total_deducted_cents` is what leaves the USD ledger: amount + service fee.
-- The *network* fee is denominated in the asset, not USD, and is already stored
-- as `quoted_network_fee` — it is paid out of the crypto being sent, so it is
-- deliberately NOT part of the USD total.
alter table public.withdrawal_requests
  add column quoted_usd_per_unit numeric(38, 18),
  add column service_fee_cents bigint not null default 0,
  add column total_deducted_cents bigint;

alter table public.withdrawal_requests
  add constraint withdrawals_service_fee_non_negative
    check (service_fee_cents >= 0),
  add constraint withdrawals_rate_positive
    check (quoted_usd_per_unit is null or quoted_usd_per_unit > 0),
  add constraint withdrawals_total_deducted_consistent
    check (
      total_deducted_cents is null
      or total_deducted_cents = amount_cents + service_fee_cents
    );

-- `cancelled` must say why no more than `completed` must: it is a normal
-- outcome. But `failed` and `rejected` still must, so the existing constraint is
-- left exactly as it is.

-- ---------------------------------------------------- platform_settings: policy
-- Both default to the honest "not configured" value:
--   · a service fee of 0 — the platform is not charging one
--   · a maximum of null — there is no ceiling, so the UI must not display one
insert into public.platform_settings (key, value) values
  ('withdrawal_service_fee_bps', '0'::jsonb),
  ('maximum_withdrawal_cents', 'null'::jsonb)
on conflict (key) do nothing;

-- ------------------------------------------------- saved_withdrawal_addresses
-- An address book, entirely opt-in.
--
-- Saving is never implicit: the application only inserts here when the user
-- ticks "Save this address", and the row carries the pair it was saved for so
-- the network can never be dropped from a display. A saved address is a
-- convenience, not an authorisation — `request_withdrawal` re-validates the
-- destination against the chain regardless of where the string came from.
create table public.saved_withdrawal_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  method_id text not null references public.payment_methods (id) on delete restrict,
  -- The user's own name for it, e.g. "Ledger — Tron".
  label text not null,
  address text not null,
  memo text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,

  constraint saved_addresses_label_not_blank check (length(trim(label)) > 0),
  constraint saved_addresses_label_length check (length(label) <= 60),
  constraint saved_addresses_address_not_blank check (length(trim(address)) > 0),
  constraint saved_addresses_address_length check (length(address) <= 128),
  -- The same address on the same network is one entry, not many.
  constraint saved_addresses_unique unique (user_id, method_id, address)
);

create index saved_withdrawal_addresses_user_idx
  on public.saved_withdrawal_addresses (user_id, created_at desc);

alter table public.saved_withdrawal_addresses enable row level security;

create policy "Saved addresses are readable by their owner"
  on public.saved_withdrawal_addresses for select to authenticated
  using (auth.uid() = user_id);

-- The only client-writable table in the payments schema, and deliberately the
-- least dangerous one: an address book entry cannot move money. `with check`
-- pins the row to the caller, so a saved address can never be planted in
-- someone else's book.
create policy "Saved addresses are created by their owner"
  on public.saved_withdrawal_addresses for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Saved addresses are deleted by their owner"
  on public.saved_withdrawal_addresses for delete to authenticated
  using (auth.uid() = user_id);

-- Renaming is allowed; re-pointing an entry at a different address or network is
-- not. Changing `address` or `method_id` in place would silently redirect a
-- destination the user believes they verified, so those columns are frozen and
-- the user must delete and re-add instead.
create policy "Saved addresses are renamed by their owner"
  on public.saved_withdrawal_addresses for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.saved_addresses_freeze_destination()
returns trigger
language plpgsql
as $$
begin
  if new.address <> old.address or new.method_id <> old.method_id then
    raise exception
      'A saved address cannot be re-pointed. Delete it and add the new one.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger saved_addresses_freeze_destination
  before update on public.saved_withdrawal_addresses
  for each row execute function public.saved_addresses_freeze_destination();

-- =============================================================================
-- Withdrawal submission, v2
--
-- Same contract as 0003 — the single write path, every check performed inside
-- the database — with three additions:
--
--   · the maximum, when one is configured. NULL means no ceiling and is not
--     treated as zero.
--   · the service fee, read from `platform_settings` in basis points and applied
--     to the requested amount. The *total deducted* is what the spendable
--     balance is checked against, not the requested amount, so a fee can never
--     push an account negative.
--   · the exchange rate the caller was quoted, recorded on the row.
--
-- Still true, and still the point: this function does not move crypto. It
-- creates a `pending` request and the negative ledger row that reserves the
-- funds. Signing and broadcast happen in the payment provider's custody
-- infrastructure, driven by a server-side worker that reads `pending` rows.
-- =============================================================================
-- The 7-argument signature from 0003 is dropped *before* the replacement is
-- created: leaving both in place would make every call ambiguous, and an old
-- client would otherwise reach a function that silently skips the maximum and
-- the service fee.
drop function if exists public.request_withdrawal(
  text, bigint, text, numeric, numeric, text, timestamptz
);

create function public.request_withdrawal(
  p_method_id text,
  p_amount_cents bigint,
  p_destination_address text,
  p_quoted_asset_amount numeric default null,
  p_quoted_network_fee numeric default null,
  p_quote_provider text default null,
  p_quoted_at timestamptz default null,
  p_quoted_usd_per_unit numeric default null
)
returns public.withdrawal_requests
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_method public.payment_methods;
  v_network public.payment_networks;
  v_status public.account_status;
  v_enabled boolean;
  v_platform_min bigint;
  v_effective_min bigint;
  v_maximum bigint;
  v_fee_bps bigint;
  v_service_fee bigint;
  v_total_deducted bigint;
  v_available bigint;
  v_pending bigint;
  v_address text := trim(p_destination_address);
  v_transaction_id uuid;
  v_request public.withdrawal_requests;
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select account_status into v_status from public.profiles where id = v_user;
  if v_status is null then
    raise exception 'No profile for this account' using errcode = 'P0002';
  end if;
  if v_status <> 'active' then
    raise exception 'Account is not active (%). Withdrawals require an active account.', v_status
      using errcode = 'P0001';
  end if;

  select coalesce((value)::text::boolean, false) into v_enabled
  from public.platform_settings where key = 'withdrawals_enabled';
  if not coalesce(v_enabled, false) then
    raise exception 'Withdrawals are not enabled on this platform yet'
      using errcode = 'P0001';
  end if;

  select * into v_method from public.payment_methods where id = p_method_id;
  if v_method.id is null then
    raise exception 'Unknown payment method: %', p_method_id using errcode = 'P0002';
  end if;
  if not v_method.withdrawal_enabled then
    raise exception 'Withdrawals are not supported for % yet', p_method_id
      using errcode = 'P0001';
  end if;

  select * into v_network from public.payment_networks where id = v_method.network_id;

  -- Wrong-network paste is the most common way funds are lost. Reject on format.
  if v_network.address_format = 'evm' and v_address !~ '^0x[a-fA-F0-9]{40}$' then
    raise exception 'Destination address is not a valid % address', v_network.name
      using errcode = '22023';
  end if;
  if v_network.address_format = 'tron' and v_address !~ '^T[1-9A-HJ-NP-Za-km-z]{33}$' then
    raise exception 'Destination address is not a valid % address', v_network.name
      using errcode = '22023';
  end if;

  select coalesce((value)::text::bigint, 50000) into v_platform_min
  from public.platform_settings where key = 'minimum_withdrawal_cents';

  v_effective_min := greatest(
    coalesce(v_platform_min, 50000),
    coalesce(v_method.min_withdrawal_cents, 0)
  );

  if p_amount_cents < v_effective_min then
    raise exception 'Minimum withdrawal is % cents', v_effective_min
      using errcode = '22023';
  end if;

  -- A maximum only exists if one is configured. `jsonb 'null'` reads as SQL NULL
  -- through this cast, so an unset ceiling is genuinely absent, not zero.
  select nullif((value)::text, 'null')::bigint into v_maximum
  from public.platform_settings where key = 'maximum_withdrawal_cents';

  if v_maximum is not null and p_amount_cents > v_maximum then
    raise exception 'Maximum withdrawal is % cents', v_maximum
      using errcode = '22023';
  end if;

  select coalesce(nullif((value)::text, 'null')::bigint, 0) into v_fee_bps
  from public.platform_settings where key = 'withdrawal_service_fee_bps';

  -- Basis points, rounded up: the platform never under-charges itself into a
  -- fractional cent it then has to absorb, and the user is shown this exact
  -- figure before confirming.
  v_service_fee := ceil(p_amount_cents * coalesce(v_fee_bps, 0) / 10000.0);
  v_total_deducted := p_amount_cents + v_service_fee;

  select available_cents, pending_withdrawal_cents
    into v_available, v_pending
  from public.user_balances where user_id = v_user;

  -- Funds already reserved by a pending request are not spendable again, and the
  -- check is against the TOTAL, so the service fee is covered too.
  if coalesce(v_available, 0) - coalesce(v_pending, 0) < v_total_deducted then
    raise exception 'Insufficient available balance' using errcode = 'P0001';
  end if;

  -- The negative ledger row. `pending` keeps it out of available_cents while
  -- counting toward pending_withdrawal_cents (see the trigger in 0001).
  insert into public.transactions (user_id, type, status, amount_cents, description)
  values (
    v_user,
    'withdrawal',
    'pending',
    -v_total_deducted,
    format('Withdrawal to %s (%s)', v_method.asset_symbol, v_network.protocol)
  )
  returning id into v_transaction_id;

  insert into public.withdrawal_requests (
    user_id, method_id, destination_address, amount_cents,
    quoted_asset_amount, quoted_network_fee, quoted_usd_per_unit,
    quote_provider, quoted_at,
    service_fee_cents, total_deducted_cents,
    status, transaction_id
  )
  values (
    v_user, p_method_id, v_address, p_amount_cents,
    p_quoted_asset_amount, p_quoted_network_fee, p_quoted_usd_per_unit,
    p_quote_provider, p_quoted_at,
    v_service_fee, v_total_deducted,
    'pending', v_transaction_id
  )
  returning * into v_request;

  return v_request;
end;
$$;

-- The 8-argument signature is now the only write path for a withdrawal.
revoke all on function public.request_withdrawal(
  text, bigint, text, numeric, numeric, text, timestamptz, numeric
) from public;

grant execute on function public.request_withdrawal(
  text, bigint, text, numeric, numeric, text, timestamptz, numeric
) to authenticated;

-- =============================================================================
-- Cancelling a pending withdrawal
--
-- The mirror of `request_withdrawal`, and the only way a user can release their
-- own reserved funds. It is deliberately narrow:
--
--   · only the caller's own row
--   · only from `pending` — once the provider has picked it up (`processing`)
--     the platform can no longer promise the transaction has not been broadcast,
--     so cancellation stops being safe and is refused
--   · the reserving ledger row is marked `cancelled`, not deleted, so the
--     history stays auditable and `recalculate_user_balance` releases the
--     reservation on its own
-- =============================================================================
create or replace function public.cancel_withdrawal(p_withdrawal_id uuid)
returns public.withdrawal_requests
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_request public.withdrawal_requests;
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select * into v_request
  from public.withdrawal_requests
  where id = p_withdrawal_id and user_id = v_user
  for update;

  if v_request.id is null then
    raise exception 'Withdrawal not found' using errcode = 'P0002';
  end if;

  if v_request.status <> 'pending' then
    raise exception
      'Only a pending withdrawal can be cancelled (this one is %).',
      v_request.status
      using errcode = 'P0001';
  end if;

  update public.withdrawal_requests
     set status = 'cancelled',
         failure_reason = 'Cancelled by account holder'
   where id = v_request.id
  returning * into v_request;

  if v_request.transaction_id is not null then
    update public.transactions
       set status = 'cancelled'
     where id = v_request.transaction_id;
  end if;

  return v_request;
end;
$$;

revoke all on function public.cancel_withdrawal(uuid) from public;
grant execute on function public.cancel_withdrawal(uuid) to authenticated;

-- =============================================================================
-- Credit a user's available balance.
--
-- One-off operational script, NOT a migration. It lives in `scripts/` on purpose:
-- migrations describe schema and are replayed against every environment, and a
-- manual credit to one specific account must never be replayed anywhere.
--
-- -----------------------------------------------------------------------------
-- Why this inserts a transaction instead of updating the balance
-- -----------------------------------------------------------------------------
-- `user_balances` is derived, not authoritative. `recalculate_user_balance()`
-- recomputes every column from the `transactions` ledger, and the
-- `transactions_refresh_balance` trigger runs it after any insert, update or
-- delete on that table.
--
-- So `update user_balances set available_cents = ...` would appear to work and
-- then be silently wiped the next time the user transacts at all — the recompute
-- would find no ledger row backing the credit and reset the balance. Writing the
-- ledger row is therefore not the pedantic route, it is the only durable one. The
-- trigger updates the balance for us.
--
-- -----------------------------------------------------------------------------
-- Why type 'adjustment'
-- -----------------------------------------------------------------------------
-- 'deposit' asserts that funds were received from the user through a payment
-- provider, which did not happen here. 'adjustment' is the type the schema
-- provides for a manual correction and is the honest description of a credit
-- granted by an operator.
--
-- The distinction is not cosmetic. `recalculate_user_balance` sorts types into
-- different columns: 'investment' drives `total_invested_cents`, and
-- 'profit_payment' / 'referral_bonus' drive `total_profit_cents`. 'adjustment'
-- lands in `available_cents` only, so this credit is spendable without appearing
-- anywhere as profit the platform claims to have generated.
--
-- -----------------------------------------------------------------------------
-- Running it
-- -----------------------------------------------------------------------------
-- Supabase Dashboard -> SQL Editor -> paste -> Run. Requires elevated access,
-- because RLS grants clients no INSERT on `transactions` by design.
--
-- Safe to run more than once: the fixed `reference` below is covered by
-- `transactions_reference_unique`, and the insert is guarded by a NOT EXISTS
-- check, so a second run credits nothing and reports the fact.
-- =============================================================================

do $$
declare
  -- ------------------------------------------------------------------ inputs
  target_user   uuid   := 'c783e7e8-4116-4ff6-8756-18e6f7901d5d';
  credit_cents  bigint := 5000000;  -- $50,000.00, in cents
  -- Deterministic, so re-running is a no-op rather than a second credit.
  credit_ref    text   := 'manual-credit-c783e7e8-50000-usd';
  credit_note   text   := 'Manual operator credit';

  profile_exists   boolean;
  already_credited boolean;
  balance_before   bigint;
  balance_after    bigint;
begin
  -- `transactions.user_id` references `profiles(id)`, so a missing profile would
  -- fail on the foreign key with a message that does not say which id was wrong.
  select exists (select 1 from public.profiles where id = target_user)
    into profile_exists;

  if not profile_exists then
    raise exception
      'No profile with id %. The user must have signed up (and had a profile row created) before a balance can be credited.',
      target_user;
  end if;

  select exists (
    select 1 from public.transactions where reference = credit_ref
  ) into already_credited;

  select coalesce(available_cents, 0) into balance_before
    from public.user_balances where user_id = target_user;
  balance_before := coalesce(balance_before, 0);

  if already_credited then
    raise notice
      'Already credited: a transaction with reference % exists. Nothing changed. Available balance remains %.',
      credit_ref, to_char(balance_before / 100.0, 'FM999,999,999.00');
    return;
  end if;

  -- `settled_at` is mandatory for a completed row
  -- (`transactions_settled_when_completed`), and only completed rows are counted
  -- into the balance by `recalculate_user_balance`.
  insert into public.transactions (
    user_id, type, status, amount_cents, currency,
    reference, description, settled_at
  )
  values (
    target_user, 'adjustment', 'completed', credit_cents, 'USD',
    credit_ref, credit_note, now()
  );

  -- Written by the trigger, not by this script. Read back to prove it happened
  -- rather than assuming it did.
  select coalesce(available_cents, 0) into balance_after
    from public.user_balances where user_id = target_user;

  raise notice 'Credited % to %. Available balance: % -> %',
    to_char(credit_cents / 100.0, 'FM999,999,999.00'),
    target_user,
    to_char(balance_before / 100.0, 'FM999,999,999.00'),
    to_char(coalesce(balance_after, 0) / 100.0, 'FM999,999,999.00');

  if coalesce(balance_after, 0) <> balance_before + credit_cents then
    raise exception
      'Balance did not move as expected (% -> %, expected %). The transactions_refresh_balance trigger may be missing; rolling back.',
      balance_before, balance_after, balance_before + credit_cents;
  end if;
end $$;

-- Verification, outside the block so it prints as a result set.
select
  b.available_cents,
  b.available_cents / 100.0 as available_usd,
  b.total_invested_cents / 100.0 as invested_usd,
  b.total_profit_cents / 100.0 as profit_usd,
  b.updated_at
from public.user_balances b
where b.user_id = 'c783e7e8-4116-4ff6-8756-18e6f7901d5d';

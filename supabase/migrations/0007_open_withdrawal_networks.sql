-- =============================================================================
-- Open network selection for withdrawals, for every account.
--
-- Two independent things stopped a user selecting a network. Both are fixed here,
-- and both statements are re-runnable.
--
--   1.  Every row in `payment_methods` had `withdrawal_enabled = false`. The
--       network picker renders a pair as disabled unless the *pair* is enabled for
--       the operation, so with all five off there was nothing selectable — the
--       screen read as broken rather than restricted.
--
--   2.  `request_withdrawal` refuses any account whose `account_status` is not
--       `active`, and `profiles.account_status` defaulted to
--       `pending_verification`. So even once networks were selectable, every
--       registered user would have been rejected at submission.
--
-- -----------------------------------------------------------------------------
-- How the verification gate is removed
-- -----------------------------------------------------------------------------
-- Requested explicitly: withdrawals available whether or not an account is
-- verified.
--
-- This does it by removing the *state*, not by editing the check. New accounts
-- default to `active` and the existing `pending_verification` rows are backfilled,
-- which leaves `request_withdrawal` byte-for-byte untouched while making its status
-- condition unreachable for ordinary users.
--
-- That is deliberate, and it is the safer of the two options. Rewriting the
-- function would mean reproducing ~150 lines of fee, minimum, maximum, address-
-- format and spendable-balance logic in order to change one `if`, and any
-- transcription slip lands directly in the path that moves money. Worse, the live
-- signature ends `…, p_quote_provider, p_quoted_at, p_quoted_usd_per_unit)`; a
-- replacement written with those last arguments in a different order creates a
-- second overload instead of replacing the first, and since the application calls
-- this RPC with *named* arguments the result is an ambiguous-function error at
-- runtime rather than an obvious failure here.
--
-- `suspended` therefore still blocks a withdrawal, which is the correct outcome:
-- suspension is a moderation decision about one account, not an unfinished signup
-- step. The instruction was to stop gating on verification, and collapsing a
-- deliberate block into that would remove the only lever for stopping abuse.
--
-- Worth stating plainly: no identity check now stands between registration and a
-- payout request. Requests are still created `pending` and settled manually, so
-- whatever review used to be implied by verification now has to happen at that
-- step. To reinstate it, set the column default back to `pending_verification` —
-- the enum still has all three values and the check in `request_withdrawal` is
-- still there, so nothing needs rebuilding.
-- =============================================================================

-- ------------------------------------------- 1. enable the withdrawal pairs
-- Deposits stay off. Crediting a balance requires a provider to confirm funds
-- arrived and none is connected, so enabling deposits would hand a user an address
-- that nothing is watching.
update public.payment_methods
   set withdrawal_enabled = true
 where id in (
         'usdt-tron',
         'usdt-ethereum',
         'usdt-bsc',
         'usdc-ethereum',
         'trx-tron'
       )
   and withdrawal_enabled = false;

-- --------------------------------------------- 2. accounts start out usable
alter table public.profiles
  alter column account_status set default 'active';

-- Every existing signup is sitting at the old default. `suspended` rows are left
-- exactly as they are.
update public.profiles
   set account_status = 'active',
       updated_at = now()
 where account_status = 'pending_verification';

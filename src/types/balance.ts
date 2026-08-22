import type { Currency } from "./investment";

/**
 * A user's ledger position, derived server-side from `transactions`.
 *
 * All figures are in cents. Every one of them is recomputed from the ledger by
 * `recalculate_user_balance()` — the application never writes or adjusts a
 * balance. A brand-new account is all zeroes, and stays that way until a real
 * deposit settles.
 */
export type UserBalance = {
  userId: string;
  currency: Currency;
  /** Spendable now: settled credits minus settled debits. */
  availableCents: number;
  /** Lifetime settled deposits. */
  totalDepositedCents: number;
  /** Lifetime settled withdrawals, reported positive. */
  totalWithdrawnCents: number;
  /** Capital committed to investments. */
  totalInvestedCents: number;
  /** Profit actually credited. Never a projection. */
  totalProfitCents: number;
  /** Reserved by withdrawals that are pending or processing. */
  pendingWithdrawalCents: number;
  updatedAt: string;
};

export const EMPTY_BALANCE: Omit<UserBalance, "userId" | "updatedAt"> = {
  currency: "USD",
  availableCents: 0,
  totalDepositedCents: 0,
  totalWithdrawnCents: 0,
  totalInvestedCents: 0,
  totalProfitCents: 0,
  pendingWithdrawalCents: 0,
};

/** What the user may actually request: available, less anything already reserved. */
export function spendableCents(balance: UserBalance): number {
  return Math.max(0, balance.availableCents - balance.pendingWithdrawalCents);
}

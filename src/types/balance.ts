import type { Currency } from "./investment";

/**
 * A user's ledger position, derived server-side from `transactions`.
 *
 * All figures are in cents. A brand-new account is all zeroes, and stays that
 * way until a real deposit settles.
 */
export type UserBalance = {
  userId: string;
  currency: Currency;
  availableCents: number;
  totalInvestedCents: number;
  totalProfitCents: number;
  pendingWithdrawalCents: number;
  updatedAt: string;
};

export const EMPTY_BALANCE: Omit<UserBalance, "userId" | "updatedAt"> = {
  currency: "USD",
  availableCents: 0,
  totalInvestedCents: 0,
  totalProfitCents: 0,
  pendingWithdrawalCents: 0,
};

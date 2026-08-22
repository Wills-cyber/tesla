import { z } from "zod";

/**
 * Wallet form schemas.
 *
 * Shared by the client (react-hook-form resolver) and the Server Actions, so a
 * request that skips the browser is validated the same way. The database function
 * `request_withdrawal` then re-checks everything a third time against rows the
 * client cannot touch — see `supabase/migrations/0003_wallet_and_payments.sql`.
 *
 * Amounts are entered in dollars and converted to cents at the boundary. Nothing
 * downstream sees a fractional dollar.
 */

/** `${assetSymbol}-${networkId}`, lowercased. Never an asset on its own. */
const methodIdField = z
  .string()
  .trim()
  .min(1, "Choose an asset and network.")
  .max(64)
  .regex(/^[a-z0-9]+-[a-z0-9]+$/, "Choose an asset and network.");

const addressField = z
  .string()
  .trim()
  .min(1, "Enter your destination wallet address.")
  .max(128, "That address is too long.")
  // Format is checked per-network once the pair is known: an address that is
  // valid on one chain is a fund-losing mistake on another.
  .regex(/^[a-zA-Z0-9]+$/, "Wallet addresses contain letters and numbers only.");

/**
 * USD amount as typed.
 *
 * Accepts up to two decimal places and rejects anything else outright rather
 * than silently rounding someone's money.
 */
const usdAmountField = z
  .string()
  .trim()
  .min(1, "Enter an amount.")
  .regex(/^\d{1,9}(\.\d{1,2})?$/, "Enter an amount like 500 or 500.00");

export const depositAddressRequestSchema = z.object({
  methodId: methodIdField,
});

export const withdrawalRequestSchema = z.object({
  methodId: methodIdField,
  amountUsd: usdAmountField,
  destinationAddress: addressField,
  /**
   * The explicit confirmation from the review step.
   *
   * Required at the schema level, not just in the UI: an unchecked box must fail
   * on the server too, or the checkbox is decoration.
   */
  addressConfirmed: z.literal(true, {
    message: "Confirm the destination address and network before withdrawing.",
  }),
});

export type DepositAddressRequestValues = z.infer<
  typeof depositAddressRequestSchema
>;
export type WithdrawalRequestValues = z.infer<typeof withdrawalRequestSchema>;

/** `"500.25"` → `50025`. Exact: the string is parsed digit-wise, not via float. */
export function usdStringToCents(value: string): number {
  const [whole, fraction = ""] = value.trim().split(".");
  const cents = fraction.padEnd(2, "0").slice(0, 2);
  return Number(whole) * 100 + Number(cents);
}

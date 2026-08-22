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

/**
 * The user's own name for a saved address.
 *
 * Rendered back to them verbatim, so it is length-bounded and stripped of
 * characters that would let a label impersonate UI chrome in a list of addresses.
 */
const addressLabelField = z
  .string()
  .trim()
  .min(1, "Give this address a name so you can recognise it.")
  .max(60, "Keep the name under 60 characters.")
  .regex(
    /^[\p{L}\p{N} .,'’&()\-—·]+$/u,
    "Use letters, numbers, spaces and basic punctuation."
  );

/**
 * The withdrawal payload, before cross-field checks.
 *
 * Kept as a plain object so `.pick()` still works for the quote schema below —
 * a refined schema is no longer an object and cannot be narrowed.
 */
const withdrawalRequestFields = z.object({
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
  /**
   * Opt-in address book entry.
   *
   * Defaults to `false`. Saving is never a side effect of withdrawing — an
   * address the user did not ask to keep is not kept.
   */
  saveAddress: z.boolean().default(false),
  addressLabel: z.string().trim().max(60).optional(),
});

export const withdrawalRequestSchema = withdrawalRequestFields
  // A save request without a name would create an unidentifiable entry, so the
  // pair is validated together rather than the label being silently defaulted.
  .refine(
    (values) => !values.saveAddress || (values.addressLabel?.length ?? 0) > 0,
    {
      path: ["addressLabel"],
      message: "Name this address, or clear “Save this address”.",
    }
  );

/**
 * The subset a quote needs.
 *
 * A separate schema rather than a `.pick()` off the refined one: the refinement
 * above covers fields a quote has no opinion about, and re-using it would make
 * quoting fail for reasons unrelated to quoting.
 */
export const withdrawalQuoteSchema = withdrawalRequestFields.pick({
  methodId: true,
  amountUsd: true,
});

export const savedAddressSchema = z.object({
  methodId: methodIdField,
  label: addressLabelField,
  address: addressField,
});

export const savedAddressIdSchema = z.object({
  id: z.uuid("That saved address reference isn't valid."),
});

export const withdrawalIdSchema = z.object({
  id: z.uuid("That withdrawal reference isn't valid."),
});

export type DepositAddressRequestValues = z.infer<
  typeof depositAddressRequestSchema
>;
export type WithdrawalRequestValues = z.infer<typeof withdrawalRequestSchema>;
export type SavedAddressValues = z.infer<typeof savedAddressSchema>;

/** `"500.25"` → `50025`. Exact: the string is parsed digit-wise, not via float. */
export function usdStringToCents(value: string): number {
  const [whole, fraction = ""] = value.trim().split(".");
  const cents = fraction.padEnd(2, "0").slice(0, 2);
  return Number(whole) * 100 + Number(cents);
}

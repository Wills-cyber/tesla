import { z } from "zod";
import {
  MAX_DEPOSIT_CENTS,
  MAX_DEPOSIT_USDT,
  MIN_DEPOSIT_CENTS,
  MIN_DEPOSIT_USDT,
} from "@/config/crypto";

/**
 * Wallet form schemas.
 *
 * Shared by client and server-side actions.
 */

/** `${assetSymbol}-${networkId}`, lowercased. */
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
  .regex(/^[a-zA-Z0-9]+$/, "Wallet addresses contain letters and numbers only.");

/**
 * USD amount as typed.
 */
const usdAmountField = z
  .string()
  .trim()
  .min(1, "Enter an amount.")
  .regex(/^\d{1,9}(\.\d{1,2})?$/, "Enter an amount like 500 or 500.00");

export const depositAddressRequestSchema = z.object({
  methodId: methodIdField,
});

/* ----------------------------------------------------------- USDT Deposit */

export const createDepositRequestSchema = z.object({
  methodId: z.enum(["usdt-bsc", "usdt-ethereum"], {
    message: "Select a valid USDT network (BEP-20 or ERC-20).",
  }),
  amountUsdt: z
    .string()
    .trim()
    .min(1, "Enter a deposit amount in USDT.")
    .regex(/^\d{1,9}(\.\d{1,2})?$/, "Enter a valid amount (e.g. 1000 or 1500.00)")
    .refine(
      (val) => {
        const cents = usdStringToCents(val);
        return cents >= MIN_DEPOSIT_CENTS;
      },
      {
        message: `Minimum deposit is ${MIN_DEPOSIT_USDT.toLocaleString("en-US")} USDT.`,
      }
    )
    .refine(
      (val) => {
        const cents = usdStringToCents(val);
        return cents <= MAX_DEPOSIT_CENTS;
      },
      {
        message: `Maximum deposit is ${MAX_DEPOSIT_USDT.toLocaleString("en-US")} USDT.`,
      }
    ),
});

export const cancelDepositSchema = z.object({
  depositId: z.string().uuid("Invalid deposit reference."),
});

export const adminApproveDepositSchema = z.object({
  depositId: z.string().uuid("Invalid deposit reference."),
});

export const adminDeclineDepositSchema = z.object({
  depositId: z.string().uuid("Invalid deposit reference."),
  reason: z
    .string()
    .trim()
    .min(1, "Please provide a decline reason.")
    .max(300, "Decline reason is too long."),
});

export type CreateDepositRequestValues = z.infer<
  typeof createDepositRequestSchema
>;
export type AdminDeclineDepositValues = z.infer<
  typeof adminDeclineDepositSchema
>;

/* --------------------------------------------------------------- Address Book */

const addressLabelField = z
  .string()
  .trim()
  .min(1, "Give this address a name so you can recognise it.")
  .max(60, "Keep the name under 60 characters.")
  .regex(
    /^[\p{L}\p{N} .,'’&()\-—·]+$/u,
    "Use letters, numbers, spaces and basic punctuation."
  );

/* --------------------------------------------------------------- Withdrawals */

const withdrawalRequestFields = z.object({
  methodId: methodIdField,
  amountUsd: usdAmountField,
  destinationAddress: addressField,
  addressConfirmed: z.literal(true, {
    message: "Confirm the destination address and network before withdrawing.",
  }),
  saveAddress: z.boolean().default(false),
  addressLabel: z.string().trim().max(60).optional(),
});

export const withdrawalRequestSchema = withdrawalRequestFields.refine(
  (values) => !values.saveAddress || (values.addressLabel?.length ?? 0) > 0,
  {
    path: ["addressLabel"],
    message: "Name this address, or clear “Save this address”.",
  }
);

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

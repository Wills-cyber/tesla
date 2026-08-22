import {
  applyBasisPoints,
  decimalProductToCents,
  subtractDecimals,
} from "@/lib/crypto/decimal";
import type { ExchangeQuote, WithdrawalCosts } from "@/types/crypto";

/**
 * The withdrawal fee breakdown.
 *
 * Deliberately a pure function with no imports from the data layer, so the same
 * code produces the figures the review screen shows and the figures the Server
 * Action checks. A fee table that is computed twice by two different routines is
 * a fee table that will eventually disagree with itself, and the number a user
 * agreed to has to be the number they are charged.
 *
 * What it will not do is fill a gap. With no live quote, every asset-side field
 * comes back `null` and the caller renders "Fee calculated at withdrawal" rather
 * than a plausible estimate — because a network fee that depends on live chain
 * conditions cannot be guessed, and a guessed fee is worse than an absent one.
 */
export function computeWithdrawalCosts({
  amountCents,
  serviceFeeBps,
  quote,
}: {
  amountCents: number;
  serviceFeeBps: number;
  quote: ExchangeQuote | null;
}): WithdrawalCosts {
  const serviceFeeCents = applyBasisPoints(amountCents, serviceFeeBps);

  const base = {
    amountCents,
    serviceFeeCents,
    totalDeductedCents: amountCents + serviceFeeCents,
  };

  if (!quote) {
    return {
      ...base,
      grossAssetAmount: null,
      networkFeeAsset: null,
      networkFeeCents: null,
      netAssetAmount: null,
      netUsdCents: null,
      quote: null,
    };
  }

  // The provider states the net itself. Recomputing it from the gross is only a
  // fallback for a provider that reports the fee but not the remainder.
  const netAssetAmount =
    quote.netAssetAmount ??
    subtractDecimals(quote.assetAmount, quote.networkFee);

  return {
    ...base,
    grossAssetAmount: quote.assetAmount,
    networkFeeAsset: quote.networkFee,
    // A fee is a charge: rounded UP, so the figure shown is never lower than the
    // cost incurred.
    networkFeeCents: decimalProductToCents(
      quote.networkFee,
      quote.usdPerUnit,
      "up"
    ),
    netAssetAmount,
    // A receipt is the opposite: rounded DOWN, so the amount shown is never
    // larger than the amount that will arrive.
    netUsdCents: netAssetAmount
      ? decimalProductToCents(netAssetAmount, quote.usdPerUnit, "down")
      : null,
    quote,
  };
}

/**
 * Is this quote still good?
 *
 * Compared against the client's clock on screen and the server's clock before
 * anything is written. A quote that has lapsed is not stretched by a grace
 * period: the whole point of an expiry is that the provider stops honouring the
 * rate at it.
 */
export function isQuoteExpired(
  quote: ExchangeQuote,
  now: number = Date.now()
): boolean {
  const expiry = new Date(quote.expiresAt).getTime();
  return Number.isNaN(expiry) || expiry <= now;
}

/** Seconds until the quote lapses. `0` once it has. */
export function quoteSecondsRemaining(
  quote: ExchangeQuote,
  now: number = Date.now()
): number {
  const expiry = new Date(quote.expiresAt).getTime();
  if (Number.isNaN(expiry)) return 0;
  return Math.max(0, Math.floor((expiry - now) / 1000));
}

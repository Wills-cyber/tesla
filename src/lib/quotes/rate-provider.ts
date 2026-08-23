import "server-only";

import {
  FIXED_QUOTE_TTL_SECONDS,
  getFixedNetworkFee,
  getFixedUsdRate,
} from "@/config/exchange-rates";
import { centsToAssetUnits, subtractDecimals } from "@/lib/crypto/decimal";
import type { PaymentMethod, QuoteResult } from "@/types/crypto";

/**
 * Exchange-rate provider abstraction.
 *
 * A withdrawal has to tell the user how much crypto their USD buys. That number
 * cannot be computed in the browser (the client is not a trustworthy source for an
 * amount the payout rail must honour), so it comes from a provider, server-side,
 * through this interface.
 *
 * Two implementations live here: `fixedRateProvider`, which prices from a
 * hand-maintained table and is what runs today, and `unconfiguredRateProvider`,
 * which refuses everything and is kept as the correct fallback for a provider whose
 * credentials are missing.
 *
 * The interface is deliberately small: one method, one shape of answer. Swapping a
 * provider is implementing `RateProvider` and returning it from
 * `getRateProvider()`; nothing else in the app changes.
 *
 * Rules every implementation must follow:
 *   · Amounts are decimal *strings*. A rate must never pass through a float.
 *   · A quote carries its own expiry, and the server re-checks it before acting.
 *   · A pair the implementation cannot price returns `unavailable`. Never a
 *     substituted or assumed rate.
 *   · Credentials are read from `process.env` inside the implementation and never
 *     re-exported. Nothing here may be imported by a Client Component.
 */

export type QuoteRequest = {
  method: PaymentMethod;
  /** USD value to convert, in cents. */
  usdCents: number;
};

export type RateProvider = {
  /** Identifier recorded on the withdrawal for auditability. */
  readonly name: string;
  /** False when the provider has no credentials configured. */
  readonly isConfigured: boolean;
  quoteUsdToAsset(request: QuoteRequest): Promise<QuoteResult>;
};

const NOT_CONFIGURED_REASON =
  "No exchange-rate provider is connected, so the live crypto amount for this " +
  "withdrawal cannot be quoted. A withdrawal is never submitted against an " +
  "estimated or stale rate.";

/**
 * The stand-in used until a provider is connected.
 *
 * It answers `unavailable` for every request — deliberately. The alternative, a
 * plausible-looking placeholder rate, would put a number on screen that the
 * payout rail would not honour, and someone would reasonably treat it as real.
 */
export const unconfiguredRateProvider: RateProvider = {
  name: "unconfigured",
  isConfigured: false,

  async quoteUsdToAsset() {
    return { status: "unavailable", reason: NOT_CONFIGURED_REASON };
  },
};

/**
 * The fixed-rate provider.
 *
 * Prices a withdrawal from the hand-maintained table in
 * `src/config/exchange-rates.ts`. It reports `name: "fixed-table"`, which is
 * recorded on every withdrawal row — so the audit trail says which rate source
 * priced a payout, and a request quoted from this table is distinguishable
 * forever from one quoted by a real provider.
 *
 * It is `isConfigured: true` because it genuinely can answer, but it is not
 * pretending to be live: `RATES_AS_OF` travels with the quote and the UI shows it.
 * That is the honest arrangement for a platform that settles manually — the user
 * sees an indicative amount now, and the exact amount is fixed at payout.
 *
 * A pair with no rate or no fee entry still returns `unavailable`. Falling back to
 * "about a dollar" for an unknown asset would be exactly the guess this interface
 * exists to prevent.
 */
export const fixedRateProvider: RateProvider = {
  name: "fixed-table",
  isConfigured: true,

  async quoteUsdToAsset({ method, usdCents }) {
    if (usdCents <= 0) {
      return { status: "unavailable", reason: "Enter an amount to see a quote." };
    }

    const usdPerUnit = getFixedUsdRate(method.asset.symbol);
    const networkFee = getFixedNetworkFee(method.id);

    if (!usdPerUnit || !networkFee) {
      return {
        status: "unavailable",
        reason:
          `No withdrawal rate is configured for ${method.asset.symbol} on ` +
          `${method.network.name}. Choose another asset or network.`,
      };
    }

    // Exact integer arithmetic on decimal strings; never a float.
    const assetAmount = centsToAssetUnits(
      usdCents,
      usdPerUnit,
      method.asset.decimals
    );
    if (!assetAmount) {
      return {
        status: "unavailable",
        reason: "That amount could not be converted. Please try a different amount.",
      };
    }

    const netAssetAmount = subtractDecimals(assetAmount, networkFee);
    if (netAssetAmount === null) {
      return {
        status: "unavailable",
        reason: "The network fee for this pair could not be applied.",
      };
    }

    // A transfer that the chain's own fee consumes entirely must not be quoted —
    // the user would pay and receive nothing.
    if (Number(netAssetAmount) <= 0) {
      return {
        status: "unavailable",
        reason:
          `The ${method.network.name} network fee (${networkFee} ` +
          `${method.asset.symbol}) is more than this withdrawal would send. ` +
          `Withdraw a larger amount, or choose a cheaper network.`,
      };
    }

    const now = new Date();
    const quotedAt = now.toISOString();
    const expiresAt = new Date(
      now.getTime() + FIXED_QUOTE_TTL_SECONDS * 1000
    ).toISOString();

    return {
      status: "ready",
      quote: {
        assetSymbol: method.asset.symbol,
        networkId: method.network.id,
        usdCents,
        assetAmount,
        usdPerUnit,
        networkFee,
        netAssetAmount,
        provider: fixedRateProvider.name,
        quotedAt,
        expiresAt,
      },
    };
  },
};

/**
 * Resolves the active provider.
 *
 * The fixed table is used until a real rate API is connected. When one is added,
 * construct it here behind its own environment check and fall back to
 * `fixedRateProvider` — so a missing credential degrades to an indicative rate
 * rather than a dead withdrawal flow.
 *
 * Example shape:
 *
 *   const key = process.env.RATE_PROVIDER_API_KEY;
 *   return key ? createCoingeckoProvider(key) : fixedRateProvider;
 */
export function getRateProvider(): RateProvider {
  return fixedRateProvider;
}

/** True when quoting can produce a number at all. */
export function isQuotingAvailable(): boolean {
  return getRateProvider().isConfigured;
}

/**
 * True when the active provider prices from the hand-maintained table rather than
 * a live feed. Drives the "indicative rate" labelling in the withdrawal UI.
 */
export function isUsingFixedRates(): boolean {
  return getRateProvider().name === fixedRateProvider.name;
}

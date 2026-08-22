import "server-only";

import type { PaymentMethod, QuoteResult } from "@/types/crypto";

/**
 * Exchange-rate provider abstraction.
 *
 * A withdrawal has to tell the user how much crypto $500 buys *right now*. That
 * number cannot be hard-coded (it would be wrong within the hour) and it cannot
 * be computed in the browser (the client is not a trustworthy source for an
 * amount the payout rail must honour). So it comes from a provider, server-side,
 * through this interface.
 *
 * The interface is deliberately small: one method, one shape of answer. Swapping
 * a provider is implementing `RateProvider` and returning it from
 * `getRateProvider()`; nothing else in the app changes.
 *
 * Rules every implementation must follow:
 *   · Amounts are decimal *strings*. A rate must never pass through a float.
 *   · A quote carries its own expiry, and the server re-checks it before acting.
 *   · The network fee comes from the provider too — it depends on live chain
 *     conditions, so a fixed fee would be a guess presented as a fact.
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
 * Resolves the active provider.
 *
 * When a real provider is added, construct it here behind its own environment
 * check and fall back to `unconfiguredRateProvider` — so a missing credential
 * degrades to an honest "can't quote" rather than a crash or a guess.
 *
 * Example shape:
 *
 *   const key = process.env.RATE_PROVIDER_API_KEY;
 *   return key ? createCoingeckoProvider(key) : unconfiguredRateProvider;
 */
export function getRateProvider(): RateProvider {
  return unconfiguredRateProvider;
}

export function isQuotingAvailable(): boolean {
  return getRateProvider().isConfigured;
}

/**
 * Fixed withdrawal exchange rates and network fees.
 *
 * ---------------------------------------------------------------------------
 * What this is, and what it is not
 * ---------------------------------------------------------------------------
 * A manually maintained rate table, used because no exchange-rate API is
 * connected. It makes withdrawal quoting work; it does not make it *live*.
 *
 * The distinction is load-bearing and the UI says so rather than hiding it. A
 * fixed rate is honest as long as it is labelled as fixed and the final settled
 * amount is determined at payout — which is exactly this platform's model, since
 * requests are reviewed and settled manually within 3–4 working days. What would
 * not be honest is presenting a stale number as a live market rate, so nothing
 * here is described as one.
 *
 * ---------------------------------------------------------------------------
 * Keeping it correct
 * ---------------------------------------------------------------------------
 * `RATES_AS_OF` is the date the figures below were last set by hand. It is
 * rendered next to the quote, so a rate that has not been touched in months is
 * visible to the user rather than silently wrong.
 *
 *   · USDT and USDC are dollar-pegged. `1.00` is correct to within the peg's
 *     normal drift, so these need review rarely and are the safe pairs to offer.
 *   · TRX floats. The figure below WILL drift and must be updated deliberately —
 *     it is the one number in this file that goes stale in a way that matters.
 *
 * Replace this whole module with a real provider by implementing `RateProvider`
 * and returning it from `getRateProvider()`; nothing else in the app changes.
 *
 * ---------------------------------------------------------------------------
 * Why strings
 * ---------------------------------------------------------------------------
 * Every figure is a decimal string and stays one all the way through
 * `centsToAssetUnits`. A rate that passes through a float can land a cent away
 * from what the payout rail computed, and a cent of drift on a money figure is a
 * support ticket that opens with "your maths is wrong".
 */

/** The date the rates below were last set by hand. ISO, UTC. */
export const RATES_AS_OF = "2026-08-23";

/**
 * How long a quote derived from this table stays valid, in seconds.
 *
 * Long, because the underlying rate is fixed — re-quoting a constant a minute
 * later produces the same constant, so a short expiry would only interrupt the
 * user without protecting anyone. A live provider should use a much shorter
 * window; that belongs to the provider, not here.
 */
export const FIXED_QUOTE_TTL_SECONDS = 900;

/**
 * USD price of one unit, by asset symbol.
 *
 * Anything absent cannot be quoted, and the withdrawal is refused rather than
 * estimated — an asset with no rate is not one this table can price.
 */
export const fixedUsdRates: Readonly<Record<string, string>> = {
  // Dollar-pegged. Reviewed rarely by design.
  USDT: "1.00",
  USDC: "1.00",
  // Floats. Review this against a market source before relying on it.
  TRX: "0.3100",
} as const;

/**
 * Network fee for a withdrawal, in units of the asset being sent, by
 * `payment_methods.id`.
 *
 * Charged by the chain, not the platform, and taken out of the transfer — so it
 * reduces what *arrives* without changing what was debited from the USD ledger.
 *
 * Set slightly conservatively (a little above typical cost) because the fee is
 * deducted from the user's transfer: quoting under the real cost would mean the
 * amount that actually lands is less than the amount promised, which is the wrong
 * direction to be wrong in. Erring high means the user occasionally receives a
 * fraction more than quoted.
 */
export const fixedNetworkFees: Readonly<Record<string, string>> = {
  // Tron: cheap and stable, paid in bandwidth/energy.
  "usdt-tron": "1.000000",
  "trx-tron": "1.100000",
  // Ethereum: by far the most expensive, and the most variable with gas.
  "usdt-ethereum": "8.000000",
  "usdc-ethereum": "8.000000",
  // BNB Smart Chain: inexpensive.
  "usdt-bsc": "0.500000",
} as const;

export function getFixedUsdRate(assetSymbol: string): string | null {
  return fixedUsdRates[assetSymbol.toUpperCase()] ?? null;
}

export function getFixedNetworkFee(methodId: string): string | null {
  return fixedNetworkFees[methodId.toLowerCase()] ?? null;
}

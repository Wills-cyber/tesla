/**
 * Crypto deposit and withdrawal domain types.
 *
 * The governing rule: **an asset does not exist on every chain.** USDT is issued
 * on Ethereum, Tron and BNB Smart Chain; USDC's network coverage is different
 * again; TRX only exists on Tron. So the unit of configuration is never an asset
 * or a network on its own — it is the *pair*, and only pairs the connected
 * payment provider can actually settle are ever shown.
 *
 * See `src/config/crypto.ts` for the catalogue and
 * `src/lib/data/payment-methods.ts` for how the backend overrides it.
 */

export type AssetKind = "stablecoin" | "native";

export type CryptoAsset = {
  /** Ticker as the provider names it, e.g. `USDT`. */
  symbol: string;
  name: string;
  kind: AssetKind;
  /** On-chain decimals. Display precision is derived from this, never guessed. */
  decimals: number;
  /** Decimal places to show in the UI. */
  displayDecimals: number;
};

/** How addresses on a chain are shaped. Used to reject typos before submission. */
export type AddressFormat = "evm" | "tron";

export type CryptoNetwork = {
  /** Stable identifier used in URLs, form values and database rows. */
  id: string;
  /** Chain name, e.g. `Tron`. */
  name: string;
  /** Token standard shown next to the asset, e.g. `TRC-20`. */
  protocol: string;
  addressFormat: AddressFormat;
  /** `null` until a provider tells us which explorer it settles through. */
  explorerTxUrlTemplate: string | null;
  /** Confirmations the provider waits for before crediting. `null` if unknown. */
  requiredConfirmations: number | null;
};

/**
 * A supported asset + network pair.
 *
 * `depositEnabled` / `withdrawalEnabled` are independent: a provider may accept
 * deposits on a chain long before it will pay out on it.
 */
export type PaymentMethod = {
  /** `${assetSymbol}-${networkId}`, lowercased. */
  id: string;
  asset: CryptoAsset;
  network: CryptoNetwork;
  depositEnabled: boolean;
  withdrawalEnabled: boolean;
  /** Provider-specific minimum, in USD cents. Falls back to the platform floor. */
  minWithdrawalCents: number | null;
};

/* ------------------------------------------------------------------ Deposits */

export type DepositAddress = {
  methodId: string;
  address: string;
  /** Some chains/exchanges require a memo or tag alongside the address. */
  memo: string | null;
  /** URI for the QR code, e.g. `tron:T…?token=…`. */
  uri: string;
  expiresAt: string | null;
};

/**
 * The result of asking for somewhere to send funds.
 *
 * `unavailable` is the honest answer while no provider is connected: there is no
 * address, so the UI must not render a copyable field or a QR code.
 */
export type DepositAddressResult =
  | { status: "available"; address: DepositAddress }
  | { status: "unavailable"; reason: string };

export type DepositRecordStatus =
  | "awaiting_funds"
  | "pending"
  | "confirmed"
  | "credited"
  | "failed";

export type DepositRecord = {
  id: string;
  methodId: string;
  assetSymbol: string;
  networkId: string;
  /** On-chain amount as a decimal string — never a float. */
  assetAmount: string | null;
  /** USD value credited, in cents. `null` until the provider settles it. */
  creditedCents: number | null;
  status: DepositRecordStatus;
  txHash: string | null;
  confirmations: number | null;
  requiredConfirmations: number | null;
  createdAt: string;
  settledAt: string | null;
};

/* --------------------------------------------------------------- Withdrawals */

export type WithdrawalStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "rejected"
  | "cancelled";

export type WithdrawalRequest = {
  id: string;
  methodId: string;
  assetSymbol: string;
  networkId: string;
  destinationAddress: string;
  /** Amount debited from the USD ledger, in cents. */
  amountCents: number;
  /** Crypto amount quoted at submission, as a decimal string. */
  quotedAssetAmount: string | null;
  /** Network fee quoted at submission, as a decimal string in the asset. */
  quotedNetworkFee: string | null;
  /** USD price of one asset unit at submission. Decimal string, never a float. */
  quotedUsdPerUnit: string | null;
  /** Which rate provider priced it. Recorded for auditability. */
  quoteProvider: string | null;
  quotedAt: string | null;
  /** Platform fee in USD cents. `0` when none is configured. */
  serviceFeeCents: number;
  /** `amountCents + serviceFeeCents`. `null` on rows written before fees. */
  totalDeductedCents: number | null;
  status: WithdrawalStatus;
  txHash: string | null;
  failureReason: string | null;
  createdAt: string;
  settledAt: string | null;
};

/** Terminal states — nothing further will happen to the request. */
export const TERMINAL_WITHDRAWAL_STATUSES = [
  "completed",
  "failed",
  "rejected",
  "cancelled",
] as const satisfies readonly WithdrawalStatus[];

export function isWithdrawalTerminal(status: WithdrawalStatus): boolean {
  return (TERMINAL_WITHDRAWAL_STATUSES as readonly string[]).includes(status);
}

/**
 * A saved destination address.
 *
 * Always carries the pair it was saved for. Displaying an address without its
 * network is how someone pays out ERC-20 USDT to a TRC-20 wallet, so the network
 * is part of the record rather than something the UI is trusted to remember.
 */
export type SavedAddress = {
  id: string;
  methodId: string;
  label: string;
  address: string;
  memo: string | null;
  createdAt: string;
  lastUsedAt: string | null;
};

/* ------------------------------------------------------------------- Quotes */

/**
 * A USD → asset conversion, produced server-side by a rate provider.
 *
 * Never hard-coded and never computed in the browser: the amount a user is shown
 * has to be the amount the payout rail will honour, which only the provider can
 * say. Amounts are decimal strings so no rate ever passes through a float.
 */
export type ExchangeQuote = {
  assetSymbol: string;
  networkId: string;
  /** USD value being converted, in cents. */
  usdCents: number;
  /** Asset units the user receives, before the network fee. */
  assetAmount: string;
  /** USD price of one asset unit at quote time. */
  usdPerUnit: string;
  /** Network fee in asset units, as quoted by the provider. */
  networkFee: string;
  /** `assetAmount - networkFee`. What actually leaves the platform. */
  netAssetAmount: string;
  provider: string;
  quotedAt: string;
  /** Quotes are short-lived; the server re-validates before it acts on one. */
  expiresAt: string;
};

export type QuoteResult =
  | { status: "ready"; quote: ExchangeQuote }
  | { status: "unavailable"; reason: string };

/* --------------------------------------------------------------------- Fees */

/**
 * What a withdrawal costs, broken into the parts a user is entitled to see.
 *
 * Two currencies are in play and conflating them is how fee displays end up
 * lying. The USD side is what leaves the platform ledger: the amount requested
 * plus any platform service fee. The asset side is what happens on-chain: the
 * network takes its fee out of the transfer itself, so it reduces what *arrives*
 * without changing what was debited.
 *
 * Every asset-side field is `null` when no live quote exists. That is not a
 * degraded state to paper over — the network fee is the provider's number and
 * depends on live chain conditions, so there is nothing honest to put there.
 */
export type WithdrawalCosts = {
  /** What the user asked to withdraw, in USD cents. */
  amountCents: number;
  /** Platform fee, in USD cents. `0` when none is configured. */
  serviceFeeCents: number;
  /** `amountCents + serviceFeeCents` — the debit against the balance. */
  totalDeductedCents: number;
  /** Asset units the quote buys, before the network fee. */
  grossAssetAmount: string | null;
  /** Network fee in asset units, as quoted by the provider. */
  networkFeeAsset: string | null;
  /** The network fee expressed in USD cents, for the fee table. */
  networkFeeCents: number | null;
  /** What actually arrives at the destination, in asset units. */
  netAssetAmount: string | null;
  /** What arrives, valued in USD cents at the quoted rate. */
  netUsdCents: number | null;
  /** The quote these figures came from, or `null` when none was available. */
  quote: ExchangeQuote | null;
};

/**
 * Platform withdrawal policy.
 *
 * `maximumCents` is `null` when no ceiling is configured, and that is a
 * meaningful `null`: the UI must render nothing rather than invent a limit.
 * `serviceFeeBps` of `0` likewise means the platform charges no fee, not that the
 * fee is unknown.
 */
export type WithdrawalPolicy = {
  minimumCents: number;
  maximumCents: number | null;
  serviceFeeBps: number;
  withdrawalsEnabled: boolean;
  depositsEnabled: boolean;
};

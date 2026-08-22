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
  | "rejected";

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
  status: WithdrawalStatus;
  txHash: string | null;
  failureReason: string | null;
  createdAt: string;
  settledAt: string | null;
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

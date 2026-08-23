import type {
  AddressFormat,
  CryptoAsset,
  CryptoNetwork,
  PaymentMethod,
} from "@/types/crypto";

/**
 * Crypto payment catalogue.
 *
 * This file declares the asset/network pairs the platform is *designed* to
 * support. It is not an assertion that any of them work today — every pair ships
 * with `depositEnabled: false` and `withdrawalEnabled: false` because no payment
 * provider is connected.
 *
 * ---------------------------------------------------------------------------
 * Source of truth
 * ---------------------------------------------------------------------------
 * Once a provider exists, the `payment_methods` table (see
 * `supabase/migrations/0003_wallet_and_payments.sql`) becomes authoritative and
 * `src/lib/data/payment-methods.ts` reads it in preference to this list. Enable a
 * pair *there*, mirroring exactly what the provider settles — never here, and
 * never because a chain "should" support the token.
 *
 * ---------------------------------------------------------------------------
 * Why pairs, not assets
 * ---------------------------------------------------------------------------
 * Sending USDT to a USDC address, or ERC-20 USDT to a TRC-20 deposit address,
 * destroys the funds irrecoverably. The UI therefore only ever offers a pair, and
 * the pair carries its own address format so a Tron address can't be submitted
 * for an Ethereum withdrawal.
 */

/* ------------------------------------------------------------------- Assets */

export const cryptoAssets = {
  USDT: {
    symbol: "USDT",
    name: "Tether USD",
    kind: "stablecoin",
    decimals: 6,
    displayDecimals: 2,
  },
  USDC: {
    symbol: "USDC",
    name: "USD Coin",
    kind: "stablecoin",
    decimals: 6,
    displayDecimals: 2,
  },
  TRX: {
    symbol: "TRX",
    name: "Tron",
    kind: "native",
    decimals: 6,
    displayDecimals: 4,
  },
} as const satisfies Record<string, CryptoAsset>;

/* ----------------------------------------------------------------- Networks */

export const cryptoNetworks = {
  ethereum: {
    id: "ethereum",
    name: "Ethereum",
    protocol: "ERC-20",
    addressFormat: "evm",
    explorerTxUrlTemplate: "https://etherscan.io/tx/{hash}",
    requiredConfirmations: null,
  },
  tron: {
    id: "tron",
    name: "Tron",
    protocol: "TRC-20",
    addressFormat: "tron",
    explorerTxUrlTemplate: "https://tronscan.org/#/transaction/{hash}",
    requiredConfirmations: null,
  },
  bsc: {
    id: "bsc",
    name: "BNB Smart Chain",
    protocol: "BEP-20",
    addressFormat: "evm",
    explorerTxUrlTemplate: "https://bscscan.com/tx/{hash}",
    requiredConfirmations: null,
  },
} as const satisfies Record<string, CryptoNetwork>;

/**
 * Address shape per chain family.
 *
 * A cheap, high-value guard: it catches the wrong-network paste — by far the most
 * common way people lose funds — before anything is submitted. It is a *format*
 * check only; the server re-validates, and a well-formed address can still be the
 * wrong one, which is why the confirmation step exists.
 */
export const addressPatterns: Record<AddressFormat, RegExp> = {
  evm: /^0x[a-fA-F0-9]{40}$/,
  tron: /^T[1-9A-HJ-NP-Za-km-z]{33}$/,
};

export const addressHints: Record<AddressFormat, string> = {
  evm: "Starts with 0x, followed by 40 hexadecimal characters.",
  tron: "Starts with T, followed by 33 characters.",
};

/* ----------------------------------------------------------------- Pairings */

function method(
  asset: CryptoAsset,
  network: CryptoNetwork,
  overrides: Partial<Pick<PaymentMethod, "depositEnabled" | "withdrawalEnabled" | "minWithdrawalCents">> = {}
): PaymentMethod {
  return {
    id: `${asset.symbol}-${network.id}`.toLowerCase(),
    asset,
    // Deposits stay off: no provider is connected to confirm incoming funds, so a
    // deposit address would be one nothing is watching.
    depositEnabled: false,
    // Withdrawal *requests* are open on every designed pair. This mirrors
    // `payment_methods.withdrawal_enabled`, which migration 0007 sets — and the
    // database row is what actually decides. This value only applies when Supabase
    // is unconfigured, so leaving it false would make the picker look broken in
    // preview while working in the real app.
    withdrawalEnabled: true,
    network,
    minWithdrawalCents: null,
    ...overrides,
  };
}

/**
 * The designed pairings.
 *
 * Note what is deliberately absent: USDC on Tron and USDC on BNB Smart Chain.
 * Both exist in the wider market, but which of them a given provider will settle
 * varies, so they are left out until a provider confirms them rather than assumed
 * into existence.
 */
export const paymentMethodCatalogue: readonly PaymentMethod[] = [
  method(cryptoAssets.USDT, cryptoNetworks.tron),
  method(cryptoAssets.USDT, cryptoNetworks.ethereum),
  method(cryptoAssets.USDT, cryptoNetworks.bsc),
  method(cryptoAssets.USDC, cryptoNetworks.ethereum),
  method(cryptoAssets.TRX, cryptoNetworks.tron),
] as const;

/* ---------------------------------------------------------- Platform policy */

/**
 * Platform-wide withdrawal floor, in USD cents.
 *
 * Enforced server-side in `src/lib/wallet/actions.ts` and again by the
 * `request_withdrawal` database function. The client shows it and blocks early as
 * a courtesy; the client is never the boundary.
 */
export const MINIMUM_WITHDRAWAL_CENTS = 50_000; // $500.00

export function findPaymentMethod(
  methods: readonly PaymentMethod[],
  methodId: string
): PaymentMethod | undefined {
  return methods.find((candidate) => candidate.id === methodId);
}

export function isValidAddressForMethod(
  method: PaymentMethod,
  address: string
): boolean {
  return addressPatterns[method.network.addressFormat].test(address.trim());
}

export function describeMethod(method: PaymentMethod): string {
  return `${method.asset.symbol} · ${method.network.protocol}`;
}

/** Builds the explorer link for a settled transaction, when one is known. */
export function buildExplorerUrl(
  network: CryptoNetwork,
  txHash: string
): string | null {
  if (!network.explorerTxUrlTemplate) return null;
  return network.explorerTxUrlTemplate.replace("{hash}", txHash);
}

/** The wrong-network warning. One wording, used everywhere it applies. */
export function networkWarning(method: PaymentMethod): string {
  return (
    `Send only ${method.asset.symbol} on the ${method.network.name} ` +
    `(${method.network.protocol}) network. Sending an unsupported asset or using ` +
    `the wrong network may result in permanent loss of funds.`
  );
}

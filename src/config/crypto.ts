import type {
  AddressFormat,
  CryptoAsset,
  CryptoNetwork,
  PaymentMethod,
} from "@/types/crypto";

/**
 * Crypto payment catalogue.
 *
 * This file declares the asset/network pairs the platform supports.
 *
 * ---------------------------------------------------------------------------
 * USDT Deposit Flow:
 * - Asset: USDT ONLY
 * - Networks: BEP-20 (BNB Smart Chain) and ERC-20 (Ethereum) ONLY
 * - QR Images: /deposits/usdt-bep20-qr.jpg and /deposits/usdt-erc20-qr.jpg
 * - Receiving Address: 0xDBC37A710fc680A8f511e71A7933E1c2d2C54531
 * - Range: 1,000 USDT to 50,000 USDT
 * ---------------------------------------------------------------------------
 */

/* ----------------------------------------------------------------- Admin User */

export const ADMIN_USER_ID = "f91a9db9-8f13-4759-9b10-a0cdf385e7d4";

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
    requiredConfirmations: 12,
  },
  tron: {
    id: "tron",
    name: "Tron",
    protocol: "TRC-20",
    addressFormat: "tron",
    explorerTxUrlTemplate: "https://tronscan.org/#/transaction/{hash}",
    requiredConfirmations: 19,
  },
  bsc: {
    id: "bsc",
    name: "BNB Smart Chain",
    protocol: "BEP-20",
    addressFormat: "evm",
    explorerTxUrlTemplate: "https://bscscan.com/tx/{hash}",
    requiredConfirmations: 15,
  },
} as const satisfies Record<string, CryptoNetwork>;

/**
 * Address shape per chain family.
 */
export const addressPatterns: Record<AddressFormat, RegExp> = {
  evm: /^0x[a-fA-F0-9]{40}$/,
  tron: /^T[1-9A-HJ-NP-Za-km-z]{33}$/,
};

export const addressHints: Record<AddressFormat, string> = {
  evm: "Starts with 0x, followed by 40 hexadecimal characters.",
  tron: "Starts with T, followed by 33 characters.",
};

/* ---------------------------------------------------------- USDT Deposit Flow */

export const RECEIVING_WALLET_ADDRESS = "0xDBC37A710fc680A8f511e71A7933E1c2d2C54531";

export const MIN_DEPOSIT_USDT = 1000;
export const MAX_DEPOSIT_USDT = 50000;
export const MIN_DEPOSIT_CENTS = 100_000; // $1,000.00
export const MAX_DEPOSIT_CENTS = 5_000_000; // $50,000.00
export const DEPOSIT_EXPIRATION_HOURS = 1;

export const DEPOSIT_NETWORK_WARNING =
  "Send USDT only through the selected network. Sending through another network may result in loss of funds.";

export type UsdtDepositNetworkConfig = {
  methodId: "usdt-bsc" | "usdt-ethereum";
  networkId: "bsc" | "ethereum";
  protocol: "BEP-20" | "ERC-20";
  networkName: string;
  chainTitle: string;
  receivingAddress: string;
  qrImagePath: string;
};

export const usdtDepositNetworks: Record<"usdt-bsc" | "usdt-ethereum", UsdtDepositNetworkConfig> = {
  "usdt-bsc": {
    methodId: "usdt-bsc",
    networkId: "bsc",
    protocol: "BEP-20",
    networkName: "BNB Smart Chain",
    chainTitle: "USDT on BNB Smart Chain",
    receivingAddress: RECEIVING_WALLET_ADDRESS,
    qrImagePath: "/deposits/usdt-bep20-qr.jpg",
  },
  "usdt-ethereum": {
    methodId: "usdt-ethereum",
    networkId: "ethereum",
    protocol: "ERC-20",
    networkName: "Ethereum",
    chainTitle: "USDT on Ethereum",
    receivingAddress: RECEIVING_WALLET_ADDRESS,
    qrImagePath: "/deposits/usdt-erc20-qr.jpg",
  },
};

export const validDepositMethodIds = ["usdt-bsc", "usdt-ethereum"] as const;

export function isUsdtDepositMethod(methodId: string): methodId is "usdt-bsc" | "usdt-ethereum" {
  return methodId === "usdt-bsc" || methodId === "usdt-ethereum";
}

export function getDepositNetworkConfig(methodId: string): UsdtDepositNetworkConfig | null {
  if (methodId === "usdt-bsc" || methodId === "usdt-ethereum") {
    return usdtDepositNetworks[methodId];
  }
  return null;
}

/* ----------------------------------------------------------------- Pairings */

function method(
  asset: CryptoAsset,
  network: CryptoNetwork,
  overrides: Partial<Pick<PaymentMethod, "depositEnabled" | "withdrawalEnabled" | "minWithdrawalCents">> = {}
): PaymentMethod {
  return {
    id: `${asset.symbol}-${network.id}`.toLowerCase(),
    asset,
    depositEnabled: false,
    withdrawalEnabled: true,
    network,
    minWithdrawalCents: null,
    ...overrides,
  };
}

export const paymentMethodCatalogue: readonly PaymentMethod[] = [
  method(cryptoAssets.USDT, cryptoNetworks.bsc, { depositEnabled: true }),
  method(cryptoAssets.USDT, cryptoNetworks.ethereum, { depositEnabled: true }),
  method(cryptoAssets.USDT, cryptoNetworks.tron, { depositEnabled: false }),
  method(cryptoAssets.USDC, cryptoNetworks.ethereum, { depositEnabled: false }),
  method(cryptoAssets.TRX, cryptoNetworks.tron, { depositEnabled: false }),
] as const;

/* ---------------------------------------------------------- Platform policy */

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

export function buildExplorerUrl(
  network: CryptoNetwork,
  txHash: string
): string | null {
  if (!network.explorerTxUrlTemplate) return null;
  return network.explorerTxUrlTemplate.replace("{hash}", txHash);
}

export function networkWarning(method: PaymentMethod): string {
  return (
    `Send only ${method.asset.symbol} on the ${method.network.name} ` +
    `(${method.network.protocol}) network. Sending an unsupported asset or using ` +
    `the wrong network may result in permanent loss of funds.`
  );
}

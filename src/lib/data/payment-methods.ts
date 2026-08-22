import "server-only";

import {
  MINIMUM_WITHDRAWAL_CENTS,
  cryptoAssets,
  cryptoNetworks,
  paymentMethodCatalogue,
} from "@/config/crypto";
import { isSupabaseConfigured } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { PaymentMethod, WithdrawalPolicy } from "@/types/crypto";
import type { Tables } from "@/types/database";

import { describeError, failed, ready, type DataResult } from "./query-context";

/**
 * Supported crypto payment pairs.
 *
 * The `payment_methods` table is authoritative: it records exactly which
 * asset/network combinations the connected payment provider settles. When
 * Supabase is unconfigured this falls back to the catalogue in
 * `src/config/crypto.ts` — which is safe only because every pair there is
 * disabled, so the fallback can describe the *shape* of the selector without
 * ever offering a route funds could be sent down.
 *
 * A pair is never inferred. USDT exists on Ethereum, Tron and BNB Smart Chain;
 * USDC's coverage differs; TRX exists only on Tron. Anything not listed by the
 * provider is not shown.
 */

function joinRows(
  methods: readonly Tables<"payment_methods">[],
  assets: readonly Tables<"payment_assets">[],
  networks: readonly Tables<"payment_networks">[]
): PaymentMethod[] {
  const assetBySymbol = new Map(assets.map((row) => [row.symbol, row]));
  const networkById = new Map(networks.map((row) => [row.id, row]));

  return methods.flatMap((row) => {
    const asset = assetBySymbol.get(row.asset_symbol);
    const network = networkById.get(row.network_id);

    // A method whose asset or network is missing is a broken configuration.
    // Dropping it is the safe outcome: it disappears from the selector rather
    // than rendering half-described.
    if (!asset || !network) return [];

    return [
      {
        id: row.id,
        asset: {
          symbol: asset.symbol,
          name: asset.name,
          kind: asset.kind === "native" ? "native" : "stablecoin",
          decimals: asset.decimals,
          displayDecimals: asset.display_decimals,
        },
        network: {
          id: network.id,
          name: network.name,
          protocol: network.protocol,
          addressFormat: network.address_format,
          explorerTxUrlTemplate: network.explorer_tx_url_template,
          requiredConfirmations: network.required_confirmations,
        },
        depositEnabled: row.deposit_enabled,
        withdrawalEnabled: row.withdrawal_enabled,
        minWithdrawalCents: row.min_withdrawal_cents,
      },
    ];
  });
}

export async function getPaymentMethods(): Promise<DataResult<PaymentMethod[]>> {
  if (!isSupabaseConfigured()) {
    return ready([...paymentMethodCatalogue]);
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) return ready([...paymentMethodCatalogue]);

  const [methods, assets, networks] = await Promise.all([
    supabase.from("payment_methods").select("*").order("sort_order"),
    supabase.from("payment_assets").select("*"),
    supabase.from("payment_networks").select("*"),
  ]);

  const error = methods.error ?? assets.error ?? networks.error;
  if (error) return failed(describeError(error, "getPaymentMethods"));

  return ready(
    joinRows(methods.data ?? [], assets.data ?? [], networks.data ?? [])
  );
}

/**
 * Platform withdrawal policy.
 *
 * Read from `platform_settings` so the floor, the ceiling and the service fee can
 * be changed without a deploy. The database function `request_withdrawal` reads
 * the same rows, so the numbers the UI shows and the numbers the server enforces
 * cannot drift.
 *
 * Two `null`-ish values are load-bearing. `maximumCents: null` means no ceiling
 * is configured and the UI must display none — an invented maximum blocks a
 * legitimate withdrawal. `serviceFeeBps: 0` means the platform charges no fee,
 * which is different from not knowing the fee: the network fee, which genuinely
 * isn't known until a provider quotes it, lives on the quote instead.
 */
export type { WithdrawalPolicy };

const FALLBACK_POLICY: WithdrawalPolicy = {
  minimumCents: MINIMUM_WITHDRAWAL_CENTS,
  maximumCents: null,
  serviceFeeBps: 0,
  withdrawalsEnabled: false,
  depositsEnabled: false,
};

function readNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : fallback;
}

/** `null` stays `null`. An absent ceiling must not collapse to zero. */
function readNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : null;
}

export async function getWithdrawalPolicy(): Promise<
  DataResult<WithdrawalPolicy>
> {
  if (!isSupabaseConfigured()) return ready(FALLBACK_POLICY);

  const supabase = await getSupabaseServerClient();
  if (!supabase) return ready(FALLBACK_POLICY);

  const { data, error } = await supabase
    .from("platform_settings")
    .select("key, value")
    .in("key", [
      "minimum_withdrawal_cents",
      "maximum_withdrawal_cents",
      "withdrawal_service_fee_bps",
      "withdrawals_enabled",
      "deposits_enabled",
    ]);

  if (error) return failed(describeError(error, "getWithdrawalPolicy"));

  const settings = new Map((data ?? []).map((row) => [row.key, row.value]));

  const maximumCents = readNullableNumber(
    settings.get("maximum_withdrawal_cents")
  );
  const minimumCents = readNumber(
    settings.get("minimum_withdrawal_cents"),
    FALLBACK_POLICY.minimumCents
  );

  return ready({
    minimumCents,
    // A ceiling below the floor is a misconfiguration that would lock every
    // withdrawal out with a contradictory message. Discard it and let the floor
    // stand rather than render an impossible range.
    maximumCents:
      maximumCents !== null && maximumCents >= minimumCents ? maximumCents : null,
    serviceFeeBps: Math.max(
      0,
      readNumber(settings.get("withdrawal_service_fee_bps"), 0)
    ),
    withdrawalsEnabled: settings.get("withdrawals_enabled") === true,
    depositsEnabled: settings.get("deposits_enabled") === true,
  });
}

/** The catalogue shape, for surfaces that only need to explain what's designed. */
export const designedAssets = cryptoAssets;
export const designedNetworks = cryptoNetworks;

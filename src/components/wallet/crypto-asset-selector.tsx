"use client";

import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import type { PaymentMethod } from "@/types/crypto";

type CryptoAssetSelectorProps = {
  /** Only the pairs the backend reports as supported for this operation. */
  methods: readonly PaymentMethod[];
  value: string | null;
  onChange: (assetSymbol: string) => void;
  /** Renders every option as unavailable, e.g. while the provider is absent. */
  disabled?: boolean;
  className?: string;
  label?: string;
};

/**
 * Asset picker.
 *
 * Derives its options from the supported pairs rather than from a hard-coded asset
 * list, so an asset only appears if at least one network is actually settleable
 * for it. Pair the selection with `NetworkSelector` — an asset alone is never
 * enough to send funds.
 */
export function CryptoAssetSelector({
  methods,
  value,
  onChange,
  disabled = false,
  className,
  label = "Asset",
}: CryptoAssetSelectorProps) {
  // One entry per asset, carrying how many networks it can settle on.
  const assets = React.useMemo(() => {
    const map = new Map<
      string,
      { asset: PaymentMethod["asset"]; networkCount: number }
    >();

    for (const method of methods) {
      const existing = map.get(method.asset.symbol);
      if (existing) existing.networkCount += 1;
      else map.set(method.asset.symbol, { asset: method.asset, networkCount: 1 });
    }

    return [...map.values()];
  }, [methods]);

  if (assets.length === 0) return null;

  return (
    <fieldset className={cn("flex flex-col gap-2.5", className)} disabled={disabled}>
      <legend className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
        {label}
      </legend>

      <div className="grid gap-2 sm:grid-cols-3">
        {assets.map(({ asset, networkCount }) => {
          const selected = value === asset.symbol;

          return (
            <button
              key={asset.symbol}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(asset.symbol)}
              disabled={disabled}
              className={cn(
                "group/asset flex items-center gap-3 rounded-xl border p-3 text-left transition-all duration-300",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                "disabled:cursor-not-allowed disabled:opacity-55",
                selected
                  ? "border-brand-border bg-brand-surface shadow-soft"
                  : "border-hairline bg-surface-1 hover:border-hairline-strong hover:bg-surface-2"
              )}
            >
              <AssetToken symbol={asset.symbol} selected={selected} />

              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  {asset.symbol}
                  {selected && (
                    <Check aria-hidden="true" className="size-3.5 text-brand" />
                  )}
                </span>
                <span className="truncate text-[0.7rem] text-muted-foreground">
                  {networkCount} {networkCount === 1 ? "network" : "networks"}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * Asset glyph.
 *
 * A typographic token rather than a third-party logo: no trademark to license, no
 * asset to load, and it stays legible at every size the app uses.
 */
export function AssetToken({
  symbol,
  selected = false,
  className,
}: {
  symbol: string;
  selected?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-full border text-[0.6rem] font-bold tracking-tight",
        selected
          ? "border-brand-border bg-surface-1 text-brand-emphasis"
          : "border-hairline bg-surface-2 text-muted-foreground",
        className
      )}
    >
      {symbol.slice(0, 4)}
    </span>
  );
}

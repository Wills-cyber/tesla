"use client";

import * as React from "react";
import { BookmarkPlus, Check, Trash2 } from "lucide-react";

import { AssetToken } from "@/components/wallet/crypto-asset-selector";
import { BrandedSpinner } from "@/components/brand/branded-loader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteSavedAddressAction } from "@/lib/wallet/actions";
import { shortenHash } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PaymentMethod, SavedAddress } from "@/types/crypto";

/**
 * Saved destination addresses for the chosen pair.
 *
 * Filtered by `methodId`, not by asset. An address book entry saved for TRC-20
 * USDT must never be offered for an ERC-20 payout, and the surest way to enforce
 * that is to key the list on the pair rather than trusting a label.
 *
 * Every entry shows its asset and network explicitly. The shortened address is a
 * convenience for scanning a list; the network is not optional detail, because
 * "Txxxx…xxxx" alone tells the user nothing about which chain the funds would
 * travel on.
 */
export function SavedAddressPicker({
  method,
  addresses,
  onSelect,
  selectedAddress,
  className,
}: {
  method: PaymentMethod;
  addresses: readonly SavedAddress[];
  onSelect: (address: string) => void;
  selectedAddress: string;
  className?: string;
}) {
  const [removingId, setRemovingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const forThisPair = React.useMemo(
    () => addresses.filter((entry) => entry.methodId === method.id),
    [addresses, method.id]
  );

  if (forThisPair.length === 0) return null;

  async function remove(id: string) {
    setRemovingId(id);
    setError(null);

    try {
      const result = await deleteSavedAddressAction(id);
      if (result.status !== "success") setError(result.message);
    } catch (caught) {
      console.error("[SavedAddressPicker] delete failed", caught);
      setError("We couldn't remove that address. Please try again.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <section className={cn("flex flex-col gap-2.5", className)}>
      <h3 className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
        Saved addresses
      </h3>

      <ul className="flex flex-col gap-2">
        {forThisPair.map((entry) => {
          const active = selectedAddress.trim() === entry.address;

          return (
            <li key={entry.id} className="flex items-stretch gap-2">
              <button
                type="button"
                onClick={() => onSelect(entry.address)}
                aria-pressed={active}
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-3 rounded-xl border p-3 text-left transition-all duration-300",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                  active
                    ? "border-brand-border bg-brand-surface shadow-soft"
                    : "border-hairline bg-surface-1 hover:border-hairline-strong hover:bg-surface-2"
                )}
              >
                <AssetToken symbol={method.asset.symbol} selected={active} />

                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold">
                      {entry.label}
                    </span>
                    {active && (
                      <Check aria-hidden="true" className="size-3.5 shrink-0 text-brand" />
                    )}
                  </span>

                  {/* Asset · network first, then the address. Never the address alone. */}
                  <span className="truncate text-[0.7rem] text-muted-foreground">
                    {method.asset.symbol} · {method.network.protocol}
                  </span>
                  <span
                    data-numeric
                    className="truncate text-[0.7rem] text-subtle-foreground"
                    title={entry.address}
                  >
                    {shortenHash(entry.address, 8, 6)}
                  </span>
                </span>
              </button>

              <Button
                type="button"
                variant="ghost"
                size="icon-lg"
                onClick={() => remove(entry.id)}
                disabled={removingId === entry.id}
                aria-label={`Remove saved address ${entry.label}`}
                className="shrink-0 self-center text-muted-foreground hover:text-destructive"
              >
                {removingId === entry.id ? <BrandedSpinner /> : <Trash2 />}
              </Button>
            </li>
          );
        })}
      </ul>

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}

/**
 * The opt-in "keep this address" control.
 *
 * Unchecked by default and it stays that way unless the user acts. Nothing about
 * completing a withdrawal implies consent to store the destination — an address
 * book that fills itself is one that eventually offers a stale address the user
 * no longer controls.
 *
 * The name field only appears once the box is ticked, and it is required at that
 * point (the server enforces the pairing too): an unnamed entry in a list of
 * addresses is indistinguishable from every other unnamed entry, which defeats the
 * purpose of saving it.
 */
export function SaveAddressToggle({
  enabled,
  onEnabledChange,
  label,
  onLabelChange,
  error,
  disabled = false,
  className,
}: {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  label: string;
  onLabelChange: (label: string) => void;
  error?: string | null;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-hairline bg-surface-2 p-4",
        className
      )}
    >
      <div className="group/field flex items-start gap-3">
        <Checkbox
          id="save-withdrawal-address"
          checked={enabled}
          disabled={disabled}
          onCheckedChange={(state) => onEnabledChange(state === true)}
          className="mt-0.5"
        />
        <Label
          htmlFor="save-withdrawal-address"
          className="flex flex-col gap-1 text-sm leading-relaxed font-medium"
        >
          <span className="inline-flex items-center gap-1.5">
            <BookmarkPlus aria-hidden="true" className="size-3.5 text-brand" />
            Save this address
          </span>
          <span className="text-xs font-normal text-muted-foreground">
            Keep it for future withdrawals on this network. Nothing is saved
            unless you tick this.
          </span>
        </Label>
      </div>

      {enabled && (
        <div className="flex flex-col gap-2 pl-7">
          <Label
            htmlFor="save-withdrawal-address-label"
            className="text-xs font-medium tracking-[0.08em] text-muted-foreground uppercase"
          >
            Saved address name
          </Label>
          <Input
            id="save-withdrawal-address-label"
            name="addressLabel"
            autoComplete="off"
            maxLength={60}
            placeholder="e.g. Ledger — Tron"
            value={label}
            onChange={(event) => onLabelChange(event.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby="save-withdrawal-address-error"
          />
          {error && (
            <p
              id="save-withdrawal-address-error"
              role="alert"
              className="text-xs text-destructive"
            >
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

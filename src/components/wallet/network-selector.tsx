"use client";

import * as React from "react";
import { AlertTriangle, Check } from "lucide-react";

import { StatusPill } from "@/components/common/status-pill";
import { cn } from "@/lib/utils";
import type { PaymentMethod } from "@/types/crypto";

type NetworkSelectorProps = {
  /** Pairs for the *already chosen* asset. Never the full catalogue. */
  methods: readonly PaymentMethod[];
  value: string | null;
  onChange: (methodId: string) => void;
  /** Which capability the caller cares about, so the right flag is honoured. */
  operation: "deposit" | "withdrawal";
  className?: string;
  label?: string;
};

/**
 * Network picker for a chosen asset.
 *
 * The critical rule: a network is only selectable when the backend reports the
 * *pair* as enabled for this operation. An asset does not exist on every chain,
 * and a provider that accepts a deposit on one chain may not pay out on it — so
 * `deposit` and `withdrawal` are read independently.
 *
 * Unsupported pairs are still rendered, disabled and labelled. Hiding them would
 * leave someone wondering whether their chain is missing by accident; showing them
 * as unavailable answers the question and still makes them unselectable.
 */
export function NetworkSelector({
  methods,
  value,
  onChange,
  operation,
  className,
  label = "Network",
}: NetworkSelectorProps) {
  if (methods.length === 0) return null;

  const isEnabled = (method: PaymentMethod) =>
    operation === "deposit" ? method.depositEnabled : method.withdrawalEnabled;

  return (
    <fieldset className={cn("flex flex-col gap-2.5", className)}>
      <legend className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
        {label}
      </legend>

      <div className="flex flex-col gap-2">
        {methods.map((method) => {
          const enabled = isEnabled(method);
          const selected = value === method.id;

          return (
            <button
              key={method.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={!enabled}
              onClick={() => onChange(method.id)}
              className={cn(
                "flex items-center justify-between gap-3 rounded-xl border p-3.5 text-left transition-all duration-300",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                !enabled && "cursor-not-allowed opacity-60",
                selected
                  ? "border-brand-border bg-brand-surface shadow-soft"
                  : "border-hairline bg-surface-1",
                enabled &&
                  !selected &&
                  "hover:border-hairline-strong hover:bg-surface-2"
              )}
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  {method.network.name}
                  <span className="rounded-md border border-hairline bg-surface-2 px-1.5 py-0.5 text-[0.62rem] font-medium tracking-[0.06em] text-muted-foreground uppercase">
                    {method.network.protocol}
                  </span>
                  {selected && (
                    <Check aria-hidden="true" className="size-3.5 text-brand" />
                  )}
                </span>
                <span className="truncate text-[0.7rem] text-muted-foreground">
                  {method.asset.symbol} on {method.network.name}
                </span>
              </span>

              {enabled ? (
                <StatusPill tone="success">Supported</StatusPill>
              ) : (
                <StatusPill tone="neutral">Not enabled</StatusPill>
              )}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * The wrong-network warning.
 *
 * Deliberately loud and deliberately non-dismissible: sending the wrong asset, or
 * the right asset over the wrong chain, is irreversible. It renders only once a
 * pair is chosen, so it can name the exact asset and network.
 */
export function NetworkWarning({
  method,
  className,
}: {
  method: PaymentMethod;
  className?: string;
}) {
  return (
    <div
      role="note"
      className={cn(
        "flex gap-3 rounded-xl border border-warning/35 bg-warning-surface p-4",
        className
      )}
    >
      <AlertTriangle
        aria-hidden="true"
        className="mt-0.5 size-4.5 shrink-0 text-warning"
      />
      <p className="text-xs leading-relaxed text-foreground">
        Send only{" "}
        <strong className="font-semibold">{method.asset.symbol}</strong> on the{" "}
        <strong className="font-semibold">
          {method.network.name} ({method.network.protocol})
        </strong>{" "}
        network. Sending an unsupported asset or using the wrong network may result
        in <strong className="font-semibold">permanent loss of funds</strong>.
      </p>
    </div>
  );
}

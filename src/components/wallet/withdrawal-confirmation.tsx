"use client";

import * as React from "react";
import { ShieldAlert } from "lucide-react";

import { WithdrawalSummary } from "@/components/wallet/withdrawal-summary";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PaymentMethod, WithdrawalCosts } from "@/types/crypto";

type WithdrawalConfirmationProps = {
  method: PaymentMethod;
  destinationAddress: string;
  costs: WithdrawalCosts;
  minimumCents: number;
  confirmed: boolean;
  onConfirmedChange: (confirmed: boolean) => void;
  /** Why no quote is available, when that is the case. */
  quoteNotice?: string | null;
  className?: string;
};

/**
 * The last screen before funds leave the platform.
 *
 * A dedicated step rather than an inline summary, because the two mistakes that
 * lose crypto permanently — wrong address, wrong network — are both invisible
 * until it is too late.
 *
 * Three specific decisions here are load-bearing:
 *
 *   · The **destination address is shown in full**, wrapped, in a monospace face,
 *     on its own row. Truncation is exactly where a swapped character hides, and
 *     `T9yD…KcbLSE` matches a great many addresses that are not the user's.
 *   · The **network is restated twice** — in the asset line and again in its own
 *     emphasised row — because "USDT" without "TRC-20" is not a destination.
 *   · The **checkbox gates the submit button**, and `withdrawalRequestSchema`
 *     requires `addressConfirmed` to be literally `true`, so a submission that
 *     arrives without it is refused by the server. The box is a control, not a
 *     nudge.
 *
 * The action buttons live in the flow's sticky footer rather than here, so on a
 * phone the primary action is always reachable without scrolling past the address
 * the user is meant to be checking.
 */
export function WithdrawalConfirmation({
  method,
  destinationAddress,
  costs,
  minimumCents,
  confirmed,
  onConfirmedChange,
  quoteNotice,
  className,
}: WithdrawalConfirmationProps) {
  const { asset, network } = method;

  return (
    <div className={cn("flex flex-col gap-5", className)}>
      <header className="flex flex-col gap-1">
        <h2 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          Confirm withdrawal details
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Check every line. A crypto transfer cannot be reversed once it is
          broadcast.
        </p>
      </header>

      {/* --------------------------------------------------- Where it is going */}
      <dl className="flex flex-col divide-y divide-hairline overflow-hidden rounded-xl border border-hairline bg-surface-1">
        <Row label="Asset" value={`${asset.symbol} — ${asset.name}`} />
        <Row
          label="Network"
          value={`${network.name} (${network.protocol})`}
          emphasis
        />

        {/* Full, wrapped, selectable. Never shortened on this screen. */}
        <div className="flex flex-col gap-1.5 px-4 py-3.5">
          <dt className="text-xs font-medium tracking-[0.08em] text-muted-foreground uppercase">
            Destination address
          </dt>
          <dd>
            <span
              data-numeric
              className="block rounded-lg border border-hairline bg-surface-3 px-3 py-2.5 text-xs leading-relaxed break-all select-all"
            >
              {destinationAddress}
            </span>
          </dd>
        </div>
      </dl>

      {/* ------------------------------------------------------ What it costs */}
      <WithdrawalSummary
        method={method}
        costs={costs}
        quoteNotice={quoteNotice}
      />

      <p className="text-[0.7rem] leading-relaxed text-subtle-foreground">
        Minimum withdrawal {formatCurrency(minimumCents)} — enforced by the
        server, not just this form. The exact crypto amount and network fee are
        re-derived and re-validated at the moment you submit.
      </p>

      {/* ---------------------------------------------------------- The gate */}
      <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive-surface p-4">
        <ShieldAlert
          aria-hidden="true"
          className="mt-0.5 size-5 shrink-0 text-destructive"
        />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-foreground">
            Please confirm that the wallet address and network are correct before
            withdrawing.
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Sending to the wrong address, or over a network your wallet does not
            support for {asset.symbol}, will permanently lose the funds. Nobody —
            including us — can recover them.
          </p>
        </div>
      </div>

      <div className="group/field flex items-start gap-3 rounded-xl border border-hairline bg-surface-2 p-4">
        <Checkbox
          id="withdrawal-address-confirmed"
          checked={confirmed}
          onCheckedChange={(state) => onConfirmedChange(state === true)}
          className="mt-0.5"
        />
        <Label
          htmlFor="withdrawal-address-confirmed"
          className="text-sm leading-relaxed font-medium text-foreground"
        >
          I confirm that the destination wallet address and selected network are
          correct.
        </Label>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <dt className="shrink-0 text-xs font-medium tracking-[0.08em] text-muted-foreground uppercase">
        {label}
      </dt>
      <dd
        className={cn(
          "min-w-0 text-sm font-semibold sm:text-right",
          emphasis ? "text-brand-emphasis" : "text-foreground"
        )}
      >
        {value}
      </dd>
    </div>
  );
}

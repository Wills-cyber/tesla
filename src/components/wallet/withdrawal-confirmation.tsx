"use client";

import * as React from "react";
import { ArrowLeft, ShieldAlert } from "lucide-react";

import { BrandedSpinner } from "@/components/brand/branded-loader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/format";
import { formatAssetAmount } from "@/lib/quotes/rate-provider";
import { cn } from "@/lib/utils";
import type { ExchangeQuote, PaymentMethod } from "@/types/crypto";

type WithdrawalConfirmationProps = {
  method: PaymentMethod;
  destinationAddress: string;
  amountCents: number;
  /** `null` when no rate provider is connected, so no amount can be shown. */
  quote: ExchangeQuote | null;
  minimumCents: number;
  confirmed: boolean;
  onConfirmedChange: (confirmed: boolean) => void;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
  /** Server-reported outcome, shown verbatim. */
  message?: string | null;
  messageTone?: "error" | "notice" | "success";
};

/**
 * The last screen before funds leave the platform.
 *
 * A dedicated step rather than an inline summary, because the two mistakes that
 * lose crypto permanently — wrong address, wrong network — are both invisible
 * until it is too late. So this restates every parameter of the transfer, shows the
 * destination in full (truncation is exactly where a swapped character hides), and
 * requires an explicit confirmation before the submit button is usable.
 *
 * The checkbox is not decoration: `withdrawalRequestSchema` requires
 * `addressConfirmed` to be literally `true`, so the server rejects a submission
 * that arrives without it.
 */
export function WithdrawalConfirmation({
  method,
  destinationAddress,
  amountCents,
  quote,
  minimumCents,
  confirmed,
  onConfirmedChange,
  onBack,
  onSubmit,
  submitting,
  message,
  messageTone = "error",
}: WithdrawalConfirmationProps) {
  const { asset, network } = method;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive-surface p-4">
        <ShieldAlert
          aria-hidden="true"
          className="mt-0.5 size-5 shrink-0 text-destructive"
        />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-foreground">
            Confirm that your wallet address and selected network are correct
            before withdrawing.
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Crypto transfers cannot be reversed. Sending to the wrong address, or
            over a network your wallet does not support for {asset.symbol}, will
            permanently lose the funds.
          </p>
        </div>
      </div>

      <dl className="flex flex-col divide-y divide-hairline overflow-hidden rounded-xl border border-hairline bg-surface-1">
        <Row label="Asset" value={`${asset.symbol} — ${asset.name}`} />
        <Row
          label="Network"
          value={`${network.name} (${network.protocol})`}
          emphasis
        />
        <Row
          label="Destination address"
          value={destinationAddress}
          mono
          wrap
        />
        <Row
          label="USD amount"
          value={formatCurrency(amountCents)}
          mono
        />
        <Row
          label="Estimated crypto amount"
          value={
            quote
              ? `${formatAssetAmount(quote.assetAmount, asset.displayDecimals)} ${asset.symbol}`
              : "Unavailable"
          }
          mono
          hint={
            quote
              ? `At ${formatCurrency(Math.round(Number(quote.usdPerUnit) * 100))} per ${asset.symbol}, quoted by ${quote.provider}.`
              : "No live exchange rate is available, so no amount can be shown."
          }
        />
        <Row
          label="Network fee"
          value={
            quote
              ? `${formatAssetAmount(quote.networkFee, asset.displayDecimals)} ${asset.symbol}`
              : "Unavailable"
          }
          mono
        />
        <Row
          label="Total crypto amount"
          value={
            quote
              ? `${formatAssetAmount(quote.netAssetAmount, asset.displayDecimals)} ${asset.symbol}`
              : "Unavailable"
          }
          mono
          emphasis
          hint="What arrives at your destination address, after the network fee."
        />
        <Row
          label="Minimum withdrawal"
          value={formatCurrency(minimumCents)}
          mono
          hint="Enforced by the server, not just this form."
        />
      </dl>

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
          I confirm that the destination address and network are correct.
        </Label>
      </div>

      {message && (
        <p
          role={messageTone === "error" ? "alert" : "status"}
          className={cn(
            "rounded-xl border p-4 text-xs leading-relaxed",
            messageTone === "error" &&
              "border-destructive/25 bg-destructive-surface text-foreground",
            messageTone === "notice" &&
              "border-brand-border bg-brand-surface text-foreground",
            messageTone === "success" &&
              "border-success/25 bg-success-surface text-foreground"
          )}
        >
          {message}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2.5 sm:flex-row">
        <Button
          type="button"
          variant="hairline"
          size="md"
          onClick={onBack}
          disabled={submitting}
          className="sm:flex-1"
        >
          <ArrowLeft />
          Back
        </Button>

        <Button
          type="button"
          variant="accent"
          size="md"
          onClick={onSubmit}
          disabled={!confirmed || submitting}
          className="sm:flex-[1.6]"
        >
          {submitting && <BrandedSpinner />}
          Confirm withdrawal
        </Button>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  hint,
  mono = false,
  wrap = false,
  emphasis = false,
}: {
  label: string;
  value: string;
  hint?: string;
  mono?: boolean;
  wrap?: boolean;
  emphasis?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <dt className="shrink-0 text-xs font-medium tracking-[0.08em] text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="flex min-w-0 flex-col gap-1 sm:items-end sm:text-right">
        <span
          {...(mono ? { "data-numeric": true } : {})}
          className={cn(
            "text-sm font-semibold",
            wrap && "break-all",
            emphasis ? "text-brand-emphasis" : "text-foreground"
          )}
        >
          {value}
        </span>
        {hint && (
          <span className="text-[0.7rem] leading-relaxed text-subtle-foreground">
            {hint}
          </span>
        )}
      </dd>
    </div>
  );
}

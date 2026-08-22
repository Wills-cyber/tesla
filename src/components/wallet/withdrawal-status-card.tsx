import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CircleCheck,
  Clock,
  ExternalLink,
  Loader,
  ShieldAlert,
  XCircle,
} from "lucide-react";

import { CancelWithdrawalButton } from "@/components/wallet/cancel-withdrawal-button";
import { StatusPill, type PillTone } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { appRoutes } from "@/config/navigation";
import { buildExplorerUrl } from "@/config/crypto";
import {
  formatAssetAmount,
  formatCurrency,
  formatDateTime,
  shortReference,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  PaymentMethod,
  WithdrawalRequest,
  WithdrawalStatus,
} from "@/types/crypto";

/**
 * How each state reads to the user, and what it actually means.
 *
 * `completed` is the only state that claims funds have left, and it is set by the
 * payout provider's confirmation — never by the application, never optimistically,
 * and never as a UI convenience. Until then a request is `pending` or `processing`
 * and the screen says so.
 */
const statusPresentation: Record<
  WithdrawalStatus,
  {
    label: string;
    tone: PillTone;
    icon: typeof Clock;
    heading: string;
    message: string;
  }
> = {
  pending: {
    label: "Pending",
    tone: "warning",
    icon: Clock,
    heading: "Withdrawal Submitted",
    message:
      "Your withdrawal request has been submitted and is being processed. The " +
      "requested amount is reserved against your balance until it settles.",
  },
  processing: {
    label: "Processing",
    tone: "info",
    icon: Loader,
    heading: "Withdrawal Processing",
    message:
      "The payout provider has picked this request up. It can no longer be " +
      "cancelled. A transaction hash will appear here once the transfer is " +
      "broadcast on-chain.",
  },
  completed: {
    label: "Completed",
    tone: "success",
    icon: CircleCheck,
    heading: "Withdrawal Completed",
    message:
      "The payout provider confirmed this transfer. The transaction details " +
      "below come from the settled on-chain transaction.",
  },
  failed: {
    label: "Failed",
    tone: "danger",
    icon: XCircle,
    heading: "Withdrawal Failed",
    message:
      "This withdrawal did not complete. The reserved funds have been returned " +
      "to your available balance.",
  },
  rejected: {
    label: "Rejected",
    tone: "danger",
    icon: ShieldAlert,
    heading: "Withdrawal Rejected",
    message:
      "This withdrawal was not approved. The reserved funds have been returned " +
      "to your available balance.",
  },
  cancelled: {
    label: "Cancelled",
    tone: "neutral",
    icon: XCircle,
    heading: "Withdrawal Cancelled",
    message:
      "You cancelled this withdrawal before it was processed. The reserved " +
      "funds are available again.",
  },
};

export function withdrawalStatusCopy(status: WithdrawalStatus) {
  return statusPresentation[status];
}

/**
 * A single withdrawal request, in full.
 *
 * The success screen and the historical record are the same component, because
 * they show the same thing: whatever the row currently says. There is no separate
 * "just submitted" view holding optimistic state, so a page reload immediately
 * after submitting shows exactly what a reload a week later would.
 *
 * A transaction hash and an explorer link render **only** when the row genuinely
 * carries a hash. No placeholder hash, no constructed explorer URL, no "view on
 * chain" link that 404s — a fabricated hash would be indistinguishable from a real
 * one until someone clicked it.
 */
export function WithdrawalStatusCard({
  withdrawal,
  method,
  className,
}: {
  withdrawal: WithdrawalRequest;
  /** `undefined` when the pair has since been removed from the catalogue. */
  method: PaymentMethod | undefined;
  className?: string;
}) {
  const presentation = statusPresentation[withdrawal.status];
  const Icon = presentation.icon;

  const explorerUrl =
    method && withdrawal.txHash
      ? buildExplorerUrl(method.network, withdrawal.txHash)
      : null;

  const decimals = method?.asset.displayDecimals ?? 2;
  const assetAmount = withdrawal.quotedAssetAmount
    ? `${formatAssetAmount(withdrawal.quotedAssetAmount, decimals)} ${withdrawal.assetSymbol}`
    : null;
  const networkFee = withdrawal.quotedNetworkFee
    ? `${formatAssetAmount(withdrawal.quotedNetworkFee, decimals)} ${withdrawal.assetSymbol}`
    : null;

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {/* ------------------------------------------------------------- Header */}
      <div
        className={cn(
          "flex flex-col items-center gap-4 rounded-2xl border p-6 text-center sm:p-8",
          withdrawal.status === "completed"
            ? "border-success/25 bg-success-surface"
            : withdrawal.status === "failed" || withdrawal.status === "rejected"
              ? "border-destructive/25 bg-destructive-surface"
              : "border-hairline bg-surface-1"
        )}
      >
        <span
          aria-hidden="true"
          className="grid size-14 place-items-center rounded-2xl border border-hairline bg-surface-1 shadow-soft"
        >
          <Icon
            className={cn(
              "size-6",
              withdrawal.status === "completed" && "text-success",
              withdrawal.status === "pending" && "text-warning",
              withdrawal.status === "processing" &&
                "text-info motion-safe:animate-spin",
              (withdrawal.status === "failed" ||
                withdrawal.status === "rejected") &&
                "text-destructive",
              withdrawal.status === "cancelled" && "text-muted-foreground"
            )}
          />
        </span>

        <div className="flex flex-col items-center gap-2.5">
          <StatusPill tone={presentation.tone} dot>
            {presentation.label}
          </StatusPill>

          <h2 className="text-xl font-semibold tracking-[-0.02em] sm:text-2xl">
            {presentation.heading}
          </h2>

          <p className="max-w-md text-sm leading-relaxed text-muted-foreground text-pretty">
            {presentation.message}
          </p>
        </div>

        <p
          data-numeric
          className="text-3xl leading-none font-semibold tracking-tight sm:text-4xl"
        >
          {formatCurrency(withdrawal.amountCents)}
        </p>
      </div>

      {/* -------------------------------------------------- Failure reason */}
      {withdrawal.failureReason &&
        withdrawal.status !== "cancelled" && (
          <div
            role="alert"
            className="flex gap-3 rounded-xl border border-destructive/30 bg-destructive-surface p-4"
          >
            <ShieldAlert
              aria-hidden="true"
              className="mt-0.5 size-4.5 shrink-0 text-destructive"
            />
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-foreground">
                What went wrong
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {withdrawal.failureReason}
              </p>
            </div>
          </div>
        )}

      {/* ----------------------------------------------------------- Details */}
      <dl className="flex flex-col divide-y divide-hairline overflow-hidden rounded-2xl border border-hairline bg-surface-1">
        <DetailRow label="Reference" value={shortReference(withdrawal.id)} mono />
        <DetailRow
          label="Asset"
          value={
            method
              ? `${method.asset.symbol} — ${method.asset.name}`
              : withdrawal.assetSymbol
          }
        />
        <DetailRow
          label="Network"
          value={
            method
              ? `${method.network.name} (${method.network.protocol})`
              : withdrawal.networkId
          }
          emphasis
        />
        <DetailRow label="Amount" value={formatCurrency(withdrawal.amountCents)} mono />

        {withdrawal.serviceFeeCents > 0 && (
          <DetailRow
            label="Service fee"
            value={formatCurrency(withdrawal.serviceFeeCents)}
            mono
          />
        )}

        {withdrawal.totalDeductedCents !== null && (
          <DetailRow
            label="Total deducted"
            value={formatCurrency(withdrawal.totalDeductedCents)}
            hint="Taken from your TESLA Electronics balance."
            mono
          />
        )}

        <DetailRow
          label="Crypto amount"
          value={assetAmount ?? "Not recorded"}
          mono={assetAmount !== null}
          hint={
            withdrawal.quotedUsdPerUnit && withdrawal.quoteProvider
              ? `Quoted at $${withdrawal.quotedUsdPerUnit} per ${withdrawal.assetSymbol} by ${withdrawal.quoteProvider}.`
              : assetAmount === null
                ? "No exchange quote was recorded for this request."
                : undefined
          }
        />

        {networkFee && (
          <DetailRow label="Network fee" value={networkFee} mono />
        )}

        <div className="flex flex-col gap-1.5 px-4 py-3.5">
          <dt className="text-xs font-medium tracking-[0.08em] text-muted-foreground uppercase">
            Destination
          </dt>
          <dd>
            <span
              data-numeric
              className="block rounded-lg border border-hairline bg-surface-3 px-3 py-2.5 text-xs leading-relaxed break-all select-all"
            >
              {withdrawal.destinationAddress}
            </span>
          </dd>
        </div>

        <DetailRow
          label="Requested"
          value={formatDateTime(withdrawal.createdAt)}
        />

        {withdrawal.settledAt && (
          <DetailRow
            label="Settled"
            value={formatDateTime(withdrawal.settledAt)}
          />
        )}

        {/* Only rendered when a real on-chain transaction exists. */}
        {withdrawal.txHash ? (
          <div className="flex flex-col gap-1.5 px-4 py-3.5">
            <dt className="text-xs font-medium tracking-[0.08em] text-muted-foreground uppercase">
              Transaction hash
            </dt>
            <dd className="flex flex-col gap-2">
              <span
                data-numeric
                className="block rounded-lg border border-hairline bg-surface-3 px-3 py-2.5 text-xs leading-relaxed break-all select-all"
              >
                {withdrawal.txHash}
              </span>

              {explorerUrl && (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 self-start text-xs font-medium text-brand-emphasis underline-offset-4 hover:underline"
                >
                  View on {method?.network.name} explorer
                  <ExternalLink aria-hidden="true" className="size-3" />
                </a>
              )}
            </dd>
          </div>
        ) : (
          <DetailRow
            label="Transaction hash"
            value="Not yet available"
            hint="A hash appears here once the payout provider broadcasts the transfer on-chain. Nothing is shown before that happens."
          />
        )}
      </dl>

      {/* ----------------------------------------------------------- Actions */}
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Button asChild variant="hairline" size="md" className="sm:flex-1">
          <Link href={appRoutes.wallet}>
            <ArrowLeft />
            Return to Wallet
          </Link>
        </Button>

        {withdrawal.status === "pending" && (
          <CancelWithdrawalButton
            withdrawalId={withdrawal.id}
            className="sm:flex-1"
          />
        )}

        {(withdrawal.status === "failed" ||
          withdrawal.status === "rejected" ||
          withdrawal.status === "cancelled") && (
          <Button asChild variant="accent" size="md" className="sm:flex-1">
            <Link href={appRoutes.withdraw}>Try Again</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  hint,
  mono = false,
  emphasis = false,
}: {
  label: string;
  value: string;
  hint?: string;
  mono?: boolean;
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
            "text-sm font-semibold break-words",
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

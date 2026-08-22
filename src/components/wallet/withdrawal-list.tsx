import * as React from "react";
import { ArrowUpFromLine, ExternalLink } from "lucide-react";

import { StatusPill, type PillTone } from "@/components/common/status-pill";
import { buildExplorerUrl } from "@/config/crypto";
import { formatAssetAmount, formatCurrency, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  PaymentMethod,
  WithdrawalRequest,
  WithdrawalStatus,
} from "@/types/crypto";

const statusCopy: Record<WithdrawalStatus, { label: string; tone: PillTone }> = {
  pending: { label: "Pending", tone: "warning" },
  processing: { label: "Processing", tone: "info" },
  completed: { label: "Completed", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
  rejected: { label: "Rejected", tone: "danger" },
};

/** `T9yD…KcbLSE` — enough to compare against a wallet without a wall of text. */
function shortenAddress(address: string): string {
  if (address.length <= 16) return address;
  return `${address.slice(0, 6)}…${address.slice(-6)}`;
}

/**
 * Withdrawal requests and their real state.
 *
 * The five states come straight from the `withdrawal_requests` row — nothing is
 * advanced optimistically. A transaction hash and an explorer link appear only when
 * a real on-chain transaction exists; until the payout provider broadcasts one,
 * there is nothing to link to and the row says so.
 */
export function WithdrawalList({
  withdrawals,
  methods,
  className,
}: {
  withdrawals: readonly WithdrawalRequest[];
  methods: readonly PaymentMethod[];
  className?: string;
}) {
  if (withdrawals.length === 0) return null;

  return (
    <ul
      aria-label="Withdrawal requests, most recent first"
      className={cn(
        "flex flex-col divide-y divide-hairline overflow-hidden rounded-2xl border border-hairline shadow-card",
        className
      )}
    >
      {withdrawals.map((withdrawal) => {
        const method = methods.find(
          (candidate) => candidate.id === withdrawal.methodId
        );
        const status = statusCopy[withdrawal.status];
        const explorerUrl =
          method && withdrawal.txHash
            ? buildExplorerUrl(method.network, withdrawal.txHash)
            : null;

        return (
          <li
            key={withdrawal.id}
            className="flex flex-col gap-3 bg-surface-1 px-4 py-4 sm:px-5"
          >
            <div className="flex items-start gap-4">
              <span
                aria-hidden="true"
                className="grid size-10 shrink-0 place-items-center rounded-xl border border-hairline bg-surface-2 text-muted-foreground"
              >
                <ArrowUpFromLine className="size-4" />
              </span>

              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-sm font-semibold">
                    {withdrawal.assetSymbol}
                    {method ? ` · ${method.network.protocol}` : ""}
                  </span>
                  <StatusPill tone={status.tone} dot>
                    {status.label}
                  </StatusPill>
                </div>

                <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[0.7rem] text-subtle-foreground">
                  <time dateTime={withdrawal.settledAt ?? withdrawal.createdAt}>
                    {formatDateTime(withdrawal.settledAt ?? withdrawal.createdAt)}
                  </time>
                  <span aria-hidden="true">·</span>
                  <span data-numeric title={withdrawal.destinationAddress}>
                    {shortenAddress(withdrawal.destinationAddress)}
                  </span>
                </span>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-0.5">
                <span
                  data-numeric
                  className="text-sm font-semibold whitespace-nowrap sm:text-base"
                >
                  {formatCurrency(withdrawal.amountCents, { signed: false })}
                </span>
                {withdrawal.quotedAssetAmount && method && (
                  <span data-numeric className="text-[0.7rem] text-muted-foreground">
                    {formatAssetAmount(
                      withdrawal.quotedAssetAmount,
                      method.asset.displayDecimals
                    )}{" "}
                    {withdrawal.assetSymbol}
                  </span>
                )}
              </div>
            </div>

            {(withdrawal.failureReason || withdrawal.txHash) && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-hairline pt-3 pl-14">
                {withdrawal.failureReason && (
                  <p className="text-xs leading-relaxed text-destructive">
                    {withdrawal.failureReason}
                  </p>
                )}

                {withdrawal.txHash &&
                  (explorerUrl ? (
                    <a
                      href={explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-emphasis underline-offset-4 hover:underline"
                    >
                      <span data-numeric>
                        {shortenAddress(withdrawal.txHash)}
                      </span>
                      <ExternalLink aria-hidden="true" className="size-3" />
                      <span className="sr-only">View on block explorer</span>
                    </a>
                  ) : (
                    <span data-numeric className="text-xs text-muted-foreground">
                      {shortenAddress(withdrawal.txHash)}
                    </span>
                  ))}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

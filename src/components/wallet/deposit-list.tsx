import * as React from "react";
import { ArrowDownToLine, ExternalLink } from "lucide-react";

import { StatusPill, type PillTone } from "@/components/common/status-pill";
import { buildExplorerUrl } from "@/config/crypto";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { formatAssetAmount } from "@/lib/quotes/rate-provider";
import { cn } from "@/lib/utils";
import type {
  DepositRecord,
  DepositRecordStatus,
  PaymentMethod,
} from "@/types/crypto";

const statusCopy: Record<
  DepositRecordStatus,
  { label: string; tone: PillTone }
> = {
  awaiting_funds: { label: "Awaiting funds", tone: "neutral" },
  pending: { label: "Pending", tone: "warning" },
  confirmed: { label: "Confirmed", tone: "info" },
  credited: { label: "Credited", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
};

function shortenHash(hash: string): string {
  if (hash.length <= 16) return hash;
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

/**
 * Observed deposits.
 *
 * Rows are written by the payment provider's webhook, never by the app, so a
 * deposit appears here because the chain showed it. The confirmation count is the
 * provider's own figure — the UI does not estimate progress, and a deposit is only
 * `Credited` once a ledger transaction exists for it (enforced by the
 * `deposits_credited_complete` constraint).
 */
export function DepositList({
  deposits,
  methods,
  className,
}: {
  deposits: readonly DepositRecord[];
  methods: readonly PaymentMethod[];
  className?: string;
}) {
  if (deposits.length === 0) return null;

  return (
    <ul
      aria-label="Deposits, most recent first"
      className={cn(
        "flex flex-col divide-y divide-hairline overflow-hidden rounded-2xl border border-hairline shadow-card",
        className
      )}
    >
      {deposits.map((deposit) => {
        const method = methods.find(
          (candidate) => candidate.id === deposit.methodId
        );
        const status = statusCopy[deposit.status];
        const explorerUrl =
          method && deposit.txHash
            ? buildExplorerUrl(method.network, deposit.txHash)
            : null;

        return (
          <li
            key={deposit.id}
            className="flex items-start gap-4 bg-surface-1 px-4 py-4 sm:px-5"
          >
            <span
              aria-hidden="true"
              className="grid size-10 shrink-0 place-items-center rounded-xl border border-hairline bg-surface-2 text-muted-foreground"
            >
              <ArrowDownToLine className="size-4" />
            </span>

            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-sm font-semibold">
                  {deposit.assetSymbol}
                  {method ? ` · ${method.network.protocol}` : ""}
                </span>
                <StatusPill tone={status.tone} dot>
                  {status.label}
                </StatusPill>
              </div>

              <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[0.7rem] text-subtle-foreground">
                <time dateTime={deposit.settledAt ?? deposit.createdAt}>
                  {formatDateTime(deposit.settledAt ?? deposit.createdAt)}
                </time>

                {deposit.confirmations !== null && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span data-numeric>
                      {deposit.confirmations}
                      {deposit.requiredConfirmations !== null
                        ? ` / ${deposit.requiredConfirmations}`
                        : ""}{" "}
                      confirmations
                    </span>
                  </>
                )}

                {deposit.txHash && (
                  <>
                    <span aria-hidden="true">·</span>
                    {explorerUrl ? (
                      <a
                        href={explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-brand-emphasis underline-offset-4 hover:underline"
                      >
                        <span data-numeric>{shortenHash(deposit.txHash)}</span>
                        <ExternalLink aria-hidden="true" className="size-3" />
                        <span className="sr-only">View on block explorer</span>
                      </a>
                    ) : (
                      <span data-numeric>{shortenHash(deposit.txHash)}</span>
                    )}
                  </>
                )}
              </span>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-0.5">
              {deposit.assetAmount && method && (
                <span
                  data-numeric
                  className="text-sm font-semibold whitespace-nowrap sm:text-base"
                >
                  {formatAssetAmount(
                    deposit.assetAmount,
                    method.asset.displayDecimals
                  )}{" "}
                  {deposit.assetSymbol}
                </span>
              )}
              <span data-numeric className="text-[0.7rem] text-muted-foreground">
                {deposit.creditedCents === null
                  ? "Not yet credited"
                  : formatCurrency(deposit.creditedCents)}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

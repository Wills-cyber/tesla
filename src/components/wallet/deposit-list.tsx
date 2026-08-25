import * as React from "react";
import Link from "next/link";
import { ArrowDownToLine, ArrowRight, ExternalLink } from "lucide-react";

import { StatusPill, type PillTone } from "@/components/common/status-pill";
import { buildExplorerUrl } from "@/config/crypto";
import { formatCurrency, formatDateTime } from "@/lib/format";
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
  pending_review: { label: "Pending Review", tone: "warning" },
  pending: { label: "Pending Payment", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  credited: { label: "Credited", tone: "success" },
  declined: { label: "Declined", tone: "danger" },
  expired: { label: "Expired", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  awaiting_funds: { label: "Awaiting funds", tone: "neutral" },
  confirmed: { label: "Confirmed", tone: "info" },
  failed: { label: "Failed", tone: "danger" },
};

function shortenHash(hash: string): string {
  if (hash.length <= 16) return hash;
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

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
        const status = statusCopy[deposit.status] || {
          label: deposit.status,
          tone: "neutral" as PillTone,
        };

        const explorerUrl =
          method && deposit.txHash
            ? buildExplorerUrl(method.network, deposit.txHash)
            : null;

        const networkProtocol = deposit.methodId.includes("bsc")
          ? "BEP-20"
          : deposit.methodId.includes("ethereum")
          ? "ERC-20"
          : method?.network.protocol ?? "";

        const isPending = deposit.status === "pending";

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
                  {networkProtocol ? ` · ${networkProtocol}` : ""}
                </span>
                <StatusPill tone={status.tone} dot>
                  {status.label}
                </StatusPill>
              </div>

              <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[0.7rem] text-subtle-foreground">
                <time dateTime={deposit.settledAt ?? deposit.createdAt}>
                  {formatDateTime(deposit.settledAt ?? deposit.createdAt)}
                </time>

                <span aria-hidden="true">·</span>
                <span data-numeric className="font-mono">
                  {deposit.reference}
                </span>

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

            <div className="flex shrink-0 flex-col items-end gap-1">
              <span
                data-numeric
                className="text-sm font-semibold whitespace-nowrap sm:text-base"
              >
                {formatCurrency(deposit.amountCents)} {deposit.assetSymbol}
              </span>

              {isPending ? (
                <Link
                  href={`/wallet/deposit/${deposit.id}`}
                  className="inline-flex items-center gap-1 text-[0.72rem] font-semibold text-brand-emphasis hover:underline"
                >
                  <span>Continue</span>
                  <ArrowRight className="size-3" />
                </Link>
              ) : (
                <span data-numeric className="text-[0.7rem] text-muted-foreground">
                  {deposit.creditedCents === null
                    ? deposit.status === "pending_review"
                      ? "Pending review"
                      : "Not credited"
                    : `Credited ${formatCurrency(deposit.creditedCents)}`}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

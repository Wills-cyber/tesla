import * as React from "react";
import Link from "next/link";
import { ArrowUpFromLine, ChevronRight, ExternalLink } from "lucide-react";

import { StatusPill } from "@/components/common/status-pill";
import { withdrawalStatusCopy } from "@/components/wallet/withdrawal-status-card";
import { appRoutes } from "@/config/navigation";
import { buildExplorerUrl } from "@/config/crypto";
import {
  formatAssetAmount,
  formatCurrency,
  formatDateTime,
  shortenHash,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PaymentMethod, WithdrawalRequest } from "@/types/crypto";

/**
 * Withdrawal history.
 *
 * The state on each row comes straight from the `withdrawal_requests` row —
 * nothing is advanced optimistically, and `Completed` appears only once the payout
 * provider has confirmed the transfer. A transaction hash and explorer link render
 * only when a real on-chain transaction exists; there are no placeholder hashes.
 *
 * Two display rules are deliberate:
 *
 *   · The **network is always shown** beside the asset. `USDT` on its own does not
 *     identify where funds went, and a history that omits it is unusable for
 *     checking a transfer against a wallet.
 *   · The address is **shortened here and only here**. It is enough to recognise a
 *     row against a wallet; the full string lives on the detail page, where it can
 *     be read character by character.
 *
 * Status colour is a single pill per row rather than a tinted row — five
 * colour-washed rows in a list stop reading as a list.
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
        const status = withdrawalStatusCopy(withdrawal.status);
        const explorerUrl =
          method && withdrawal.txHash
            ? buildExplorerUrl(method.network, withdrawal.txHash)
            : null;

        const networkLabel =
          method?.network.protocol ?? withdrawal.networkId.toUpperCase();

        return (
          <li key={withdrawal.id} className="bg-surface-1">
            {/* The whole row is the link to the detail page. The explorer link
                below sits outside it, so it can't be swallowed by the anchor. */}
            <Link
              href={appRoutes.withdrawalDetail(withdrawal.id)}
              className={cn(
                "flex items-start gap-4 px-4 py-4 transition-colors duration-300 sm:px-5",
                "hover:bg-surface-2 focus-visible:bg-surface-2",
                "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
              )}
            >
              <span
                aria-hidden="true"
                className="grid size-10 shrink-0 place-items-center rounded-xl border border-hairline bg-surface-2 text-muted-foreground"
              >
                <ArrowUpFromLine className="size-4" />
              </span>

              <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <span className="text-sm font-semibold">
                    {withdrawal.assetSymbol}
                    <span className="text-muted-foreground"> · {networkLabel}</span>
                  </span>
                  <StatusPill tone={status.tone} dot>
                    {status.label}
                  </StatusPill>
                </span>

                <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[0.7rem] text-subtle-foreground">
                  <time dateTime={withdrawal.settledAt ?? withdrawal.createdAt}>
                    {formatDateTime(withdrawal.settledAt ?? withdrawal.createdAt)}
                  </time>
                  <span aria-hidden="true">·</span>
                  <span data-numeric title={withdrawal.destinationAddress}>
                    {shortenHash(withdrawal.destinationAddress, 6, 6)}
                  </span>
                </span>

                {withdrawal.failureReason && (
                  <span className="text-xs leading-relaxed text-destructive">
                    {withdrawal.failureReason}
                  </span>
                )}
              </span>

              <span className="flex shrink-0 items-center gap-2">
                <span className="flex flex-col items-end gap-0.5">
                  <span
                    data-numeric
                    className="text-sm font-semibold whitespace-nowrap sm:text-base"
                  >
                    {formatCurrency(withdrawal.amountCents)}
                  </span>

                  {withdrawal.quotedAssetAmount ? (
                    <span
                      data-numeric
                      className="text-[0.7rem] whitespace-nowrap text-muted-foreground"
                    >
                      {formatAssetAmount(
                        withdrawal.quotedAssetAmount,
                        method?.asset.displayDecimals ?? 2
                      )}{" "}
                      {withdrawal.assetSymbol}
                    </span>
                  ) : (
                    <span className="text-[0.7rem] whitespace-nowrap text-subtle-foreground">
                      No quote recorded
                    </span>
                  )}
                </span>

                <ChevronRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-subtle-foreground"
                />
              </span>
            </Link>

            {/* Only when a real transaction exists. Never a constructed link. */}
            {withdrawal.txHash && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-hairline px-4 py-2.5 pl-14 sm:px-5 sm:pl-[4.75rem]">
                <span className="text-[0.65rem] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                  Tx
                </span>

                {explorerUrl ? (
                  <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-emphasis underline-offset-4 hover:underline"
                  >
                    <span data-numeric>{shortenHash(withdrawal.txHash)}</span>
                    <ExternalLink aria-hidden="true" className="size-3" />
                    <span className="sr-only">View on block explorer</span>
                  </a>
                ) : (
                  <span data-numeric className="text-xs text-muted-foreground">
                    {shortenHash(withdrawal.txHash)}
                  </span>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { Download, ExternalLink, Receipt } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { TransactionStatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { appRoutes } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import {
  formatCurrency,
  formatDateNumeric,
  formatDateTime,
  shortenHash,
} from "@/lib/format";
import type { Transaction } from "@/types/transaction";
import type { WithdrawalRequest } from "@/types/crypto";

/**
 * Extra detail that only exists for withdrawals.
 *
 * Asset, network, destination and transaction hash live on `withdrawal_requests`,
 * not on the ledger row, so they are passed in when the caller has the matching
 * record and simply omitted when it doesn't. The receipt renders whatever it is
 * given and states nothing it wasn't — a missing network line is preferable to a
 * guessed one.
 */
export type ReceiptWithdrawal = Pick<
  WithdrawalRequest,
  | "id"
  | "assetSymbol"
  | "destinationAddress"
  | "quotedAssetAmount"
  | "status"
  | "txHash"
> & { networkLabel?: string | null; explorerUrl?: string | null };

const typeLabels: Record<Transaction["type"], string> = {
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  investment: "Investment",
  profit_payment: "Profit",
  principal_return: "Principal Return",
  referral_bonus: "Referral Bonus",
  adjustment: "Adjustment",
};

/**
 * Transaction receipt.
 *
 * Built entirely from the transaction row (plus the withdrawal row where one
 * exists). Every field is either present in the data or omitted — there is no
 * placeholder, no derived "expected" value dressed up as a fact, and in particular
 * no transaction hash or explorer link unless a real hash is recorded. An
 * on-chain reference is the one thing on a receipt a user will act on, so
 * inventing one would be the most damaging possible fabrication.
 *
 * The download is generated in the browser from the same object that rendered the
 * dialog, so the file cannot disagree with the screen. It is plain text rather than
 * a PDF: a PDF would mean a new dependency and a bundle cost for something the user
 * mostly needs in order to forward it to somebody.
 */
export function TransactionReceipt({
  transaction,
  withdrawal,
  trigger,
}: {
  transaction: Transaction;
  withdrawal?: ReceiptWithdrawal | null;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);

  const isCredit = transaction.amountCents > 0;
  const isWithdrawal = transaction.type === "withdrawal";
  const when = transaction.settledAt ?? transaction.createdAt;

  const rows: { label: string; value: string; numeric?: boolean }[] = [
    { label: "Transaction ID", value: transaction.reference, numeric: true },
    { label: "Type", value: typeLabels[transaction.type] },
    { label: "Date", value: formatDateNumeric(when) },
    { label: "Time", value: formatDateTime(when) },
  ];

  if (withdrawal?.assetSymbol) {
    rows.push({ label: "Asset", value: withdrawal.assetSymbol });
  }
  if (withdrawal?.networkLabel) {
    rows.push({ label: "Network", value: withdrawal.networkLabel });
  }
  if (withdrawal?.quotedAssetAmount && withdrawal.assetSymbol) {
    rows.push({
      label: "Estimated crypto amount",
      value: `${withdrawal.quotedAssetAmount} ${withdrawal.assetSymbol}`,
      numeric: true,
    });
  }
  if (withdrawal?.destinationAddress) {
    rows.push({
      label: "Destination",
      value: shortenHash(withdrawal.destinationAddress, 10, 8),
      numeric: true,
    });
  }
  if (transaction.description) {
    rows.push({ label: "Description", value: transaction.description });
  }

  function download() {
    const lines = [
      siteConfig.name,
      "Transaction Receipt",
      "",
      ...rows.map((row) => `${row.label}: ${row.value}`),
      `Status: ${transaction.status}`,
      `Amount: ${formatCurrency(transaction.amountCents, {
        currency: transaction.currency,
        signed: true,
      })}`,
    ];

    if (isWithdrawal) {
      lines.push("Expected processing time: 3–4 working days");
    }
    // Only ever written when one genuinely exists.
    if (withdrawal?.txHash) {
      lines.push(`Transaction hash: ${withdrawal.txHash}`);
    }

    lines.push(
      "",
      siteConfig.affiliationDisclaimer,
      `Generated ${formatDateTime(new Date().toISOString())}`
    );

    const blob = new Blob([lines.join("\n")], {
      type: "text/plain;charset=utf-8",
    });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `tesla-electronics-receipt-${transaction.reference}.txt`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`View receipt for ${typeLabels[transaction.type]} of ${formatCurrency(
          transaction.amountCents,
          { currency: transaction.currency, signed: true }
        )}`}
        className="w-full cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        {trigger}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88vh] gap-0 overflow-y-auto p-0 shadow-float sm:max-w-md">
          {/* ------------------------------------------------------- Letterhead */}
          <DialogHeader className="items-center gap-3 border-b border-hairline bg-surface-2 p-6 text-center">
            <Logo />
            <DialogTitle className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              Transaction Receipt
            </DialogTitle>
            <DialogDescription className="sr-only">
              Receipt for transaction {transaction.reference}
            </DialogDescription>
          </DialogHeader>

          {/* ----------------------------------------------------- Amount block */}
          <div className="flex flex-col items-center gap-2.5 border-b border-hairline p-6 text-center">
            <span
              data-numeric
              className={
                isCredit
                  ? "text-3xl font-semibold tracking-tight text-success"
                  : "text-3xl font-semibold tracking-tight text-foreground"
              }
            >
              {formatCurrency(transaction.amountCents, {
                currency: transaction.currency,
                signed: true,
              })}
            </span>
            <TransactionStatusPill status={transaction.status} />
          </div>

          {/* ---------------------------------------------------------- Details */}
          <dl className="flex flex-col">
            {rows.map((row) => (
              <div
                key={row.label}
                className="flex items-baseline justify-between gap-4 border-b border-hairline px-6 py-3 even:bg-surface-2/50"
              >
                <dt className="shrink-0 text-xs text-muted-foreground">
                  {row.label}
                </dt>
                <dd
                  {...(row.numeric ? { "data-numeric": "" } : {})}
                  className="min-w-0 text-right text-xs font-semibold break-words text-foreground"
                >
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="flex flex-col gap-4 p-6">
            {isWithdrawal && (
              <p className="rounded-xl border border-hairline bg-surface-2 p-3.5 text-[0.7rem] leading-relaxed text-muted-foreground">
                <strong className="font-semibold text-foreground">
                  Expected processing time: 3–4 working days.
                </strong>{" "}
                A withdrawal is settled once a payout provider confirms the
                transfer. Until then this receipt records a submitted request, not
                a completed transfer.
              </p>
            )}

            {/* The hash and explorer link appear only for a real, recorded hash. */}
            {withdrawal?.txHash ? (
              <div className="flex flex-col gap-2 rounded-xl border border-hairline bg-surface-1 p-3.5">
                <span className="text-[0.62rem] font-medium tracking-[0.12em] text-muted-foreground uppercase">
                  Transaction hash
                </span>
                <span
                  data-numeric
                  className="text-xs font-semibold break-all text-foreground"
                >
                  {withdrawal.txHash}
                </span>
                {withdrawal.explorerUrl && (
                  <a
                    href={withdrawal.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-emphasis hover:underline"
                  >
                    View on blockchain explorer
                    <ExternalLink aria-hidden="true" className="size-3" />
                  </a>
                )}
              </div>
            ) : isWithdrawal ? (
              <p className="text-[0.7rem] leading-relaxed text-subtle-foreground">
                No transaction hash yet — one appears here only once the transfer
                is actually broadcast on-chain.
              </p>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="hairline"
                size="md"
                onClick={download}
                className="flex-1"
              >
                <Download />
                Download Receipt
              </Button>

              {withdrawal?.id ? (
                <Button asChild variant="ghost" size="md" className="flex-1">
                  <Link href={appRoutes.withdrawalDetail(withdrawal.id)}>
                    <Receipt />
                    View Transaction
                  </Link>
                </Button>
              ) : transaction.investmentId ? (
                <Button asChild variant="ghost" size="md" className="flex-1">
                  <Link href={appRoutes.investments}>
                    <Receipt />
                    View Investment
                  </Link>
                </Button>
              ) : null}
            </div>

            <p className="text-center text-[0.62rem] leading-relaxed text-subtle-foreground">
              {siteConfig.affiliationDisclaimer}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

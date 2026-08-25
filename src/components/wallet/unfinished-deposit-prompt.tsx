"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";

import { BrandedSpinner } from "@/components/brand/branded-loader";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format";
import { cancelDepositAction } from "@/lib/wallet/actions";
import type { DepositRecord } from "@/types/crypto";

type UnfinishedDepositPromptProps = {
  deposit: DepositRecord | null;
};

function getDepositRemainingSeconds(expiresAt?: string | null): number | null {
  if (!expiresAt) return null;
  const expires = new Date(expiresAt).getTime();
  return Math.max(0, Math.floor((expires - Date.now()) / 1000));
}

export function UnfinishedDepositPrompt({
  deposit,
}: UnfinishedDepositPromptProps) {
  const router = useRouter();
  const [cancelling, setCancelling] = React.useState(false);
  const [showCancelDialog, setShowCancelDialog] = React.useState(false);

  const expiresAt = deposit?.expiresAt;
  const [secondsRemaining, setSecondsRemaining] = React.useState<number | null>(
    () => getDepositRemainingSeconds(expiresAt)
  );

  React.useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const remaining = getDepositRemainingSeconds(expiresAt);
      setSecondsRemaining(remaining);
      if (remaining !== null && remaining <= 0) {
        clearInterval(interval);
        router.refresh();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, router]);

  if (!deposit || deposit.status !== "pending") return null;
  if (secondsRemaining !== null && secondsRemaining <= 0) return null;

  const minutes = Math.floor((secondsRemaining ?? 0) / 60);
  const seconds = (secondsRemaining ?? 0) % 60;
  const timeFormatted = `${minutes}m ${seconds.toString().padStart(2, "0")}s`;

  const networkProtocol = deposit.methodId.includes("bsc")
    ? "BEP-20 (BNB Smart Chain)"
    : "ERC-20 (Ethereum)";

  async function handleConfirmCancel() {
    if (!deposit) return;
    setCancelling(true);
    try {
      const result = await cancelDepositAction(deposit.id);
      if (result.status === "success") {
        toast.success("Pending deposit cancelled.");
        setShowCancelDialog(false);
        router.refresh();
      } else {
        toast.error(result.message || "Failed to cancel deposit.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <>
      <section
        aria-label="Pending deposit notice"
        className="relative overflow-hidden rounded-2xl border border-brand/35 bg-brand-surface p-5 shadow-card md:p-6"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-12 -right-12 size-44 rounded-full bg-brand/10 blur-2xl"
        />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <span
              aria-hidden="true"
              className="grid size-10 shrink-0 place-items-center rounded-xl border border-brand-border bg-brand/10 text-brand-emphasis"
            >
              <Clock className="size-5" />
            </span>

            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold tracking-wider text-brand-emphasis uppercase">
                  Active Request
                </span>
                <span
                  data-numeric
                  className="rounded-full bg-brand-surface-strong px-2 py-0.5 text-[0.7rem] font-semibold text-brand-emphasis"
                >
                  {timeFormatted} remaining
                </span>
              </div>

              <h2 className="text-base font-semibold text-foreground sm:text-lg">
                Complete your pending deposit?
              </h2>

              <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                You have a pending deposit of{" "}
                <strong className="text-foreground">
                  {formatCurrency(deposit.amountCents)} USDT
                </strong>{" "}
                on <strong className="text-foreground">{networkProtocol}</strong>.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-1 sm:pt-0">
            <Button asChild variant="accent" size="md">
              <Link href={`/wallet/deposit/${deposit.id}`}>
                Continue Deposit
                <ArrowRight />
              </Link>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => setShowCancelDialog(true)}
              className="text-muted-foreground hover:text-destructive"
            >
              <XCircle className="size-4" />
              Cancel Deposit
            </Button>
          </div>
        </div>
      </section>

      {/* Confirmation Dialog for Cancellation */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mb-2 grid size-10 place-items-center rounded-xl bg-destructive/10 text-destructive">
              <AlertTriangle className="size-5" />
            </div>
            <DialogTitle>Cancel Pending Deposit?</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your pending deposit of{" "}
              <strong>{formatCurrency(deposit.amountCents)} USDT</strong>? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="hairline"
              size="md"
              onClick={() => setShowCancelDialog(false)}
              disabled={cancelling}
            >
              Keep Deposit
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="md"
              onClick={handleConfirmCancel}
              disabled={cancelling}
            >
              {cancelling && <BrandedSpinner />}
              Yes, Cancel Deposit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";

import { BrandedSpinner } from "@/components/brand/branded-loader";
import { Button } from "@/components/ui/button";
import { cancelWithdrawalAction } from "@/lib/wallet/actions";
import { cn } from "@/lib/utils";

/**
 * Cancels a pending withdrawal.
 *
 * Two-press by design: the first press asks, the second acts. A single-press
 * cancel next to "Return to Wallet" is a mis-tap away from releasing a request the
 * user meant to keep — and while cancelling is safe (the funds come back), having
 * to re-enter a 42-character address is not a small cost.
 *
 * The button does not decide anything. `cancel_withdrawal` in Postgres owns the
 * rules: it checks ownership, refuses anything that is not `pending`, and marks
 * the reserving ledger row `cancelled` so the balance recalculation releases the
 * reservation. If the provider has already picked the request up, the database
 * says no and that refusal is what gets shown.
 */
export function CancelWithdrawalButton({
  withdrawalId,
  className,
}: {
  withdrawalId: string;
  className?: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // The armed state disarms itself, so a forgotten press doesn't leave a live
  // destructive button sitting on screen.
  React.useEffect(() => {
    if (!confirming) return;
    const timer = window.setTimeout(() => setConfirming(false), 6000);
    return () => window.clearTimeout(timer);
  }, [confirming]);

  async function cancel() {
    setPending(true);
    setError(null);

    try {
      const result = await cancelWithdrawalAction(withdrawalId);

      if (result.status === "success") {
        setConfirming(false);
        // Re-read the row rather than assuming the new status: the server is the
        // only thing that knows what the withdrawal actually looks like now.
        router.refresh();
        return;
      }

      setError(result.message);
      setConfirming(false);
    } catch (caught) {
      console.error("[CancelWithdrawalButton] failed", caught);
      setError(
        "We couldn't reach the server, so nothing was cancelled. Please try again."
      );
      setConfirming(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Button
        type="button"
        variant={confirming ? "destructive" : "ghost"}
        size="md"
        onClick={() => (confirming ? cancel() : setConfirming(true))}
        disabled={pending}
        aria-describedby={error ? "cancel-withdrawal-error" : undefined}
        className="w-full"
      >
        {pending ? <BrandedSpinner /> : <Ban />}
        {pending
          ? "Cancelling…"
          : confirming
            ? "Tap again to cancel"
            : "Cancel withdrawal"}
      </Button>

      {confirming && !pending && (
        <p className="text-center text-[0.7rem] text-muted-foreground">
          The reserved funds return to your available balance.
        </p>
      )}

      {error && (
        <p
          id="cancel-withdrawal-error"
          role="alert"
          className="text-center text-xs text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  );
}

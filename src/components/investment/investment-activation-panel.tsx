"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from "lucide-react";

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
import { appRoutes } from "@/config/navigation";
import { activateInvestmentAction } from "@/lib/investment/actions";
import { formatCurrency, formatDuration } from "@/lib/format";
import type { InvestmentPlan } from "@/types/investment";

type ActivationPanelProps = {
  plan: InvestmentPlan;
  /** Spendable balance in cents: available minus anything a withdrawal reserves. */
  spendableCents: number;
  /** False when the plan is not `open` or activation is switched off globally. */
  activationEnabled: boolean;
};

/**
 * The Start Investment action.
 *
 * Two presses, never one. The first opens a confirmation showing the complete term
 * sheet — entry amount, term, weekly figure, number of periods, total stated
 * profit, completion amount — and only the second creates anything. Committing
 * four figures of real balance should not be reachable by a single mis-tap.
 *
 * This component authorises nothing. It renders a button and shows what the server
 * said. `activateInvestmentAction` re-derives the plan and the balance, and
 * `activate_investment` in Postgres re-checks that the plan is open and the funds
 * are there before writing anything. The insufficient-balance branch below is a
 * courtesy so the user sees the shortfall immediately; it is not the control that
 * prevents an overdraft.
 *
 * On success it does not paint an outcome of its own — it refreshes and navigates
 * to Investments, so what the user sees next is read back from the database.
 */
export function InvestmentActivationPanel({
  plan,
  spendableCents,
  activationEnabled,
}: ActivationPanelProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<string | null>(null);

  const fundsAvailable = spendableCents >= plan.investmentAmountCents;
  const shortfallCents = Math.max(
    0,
    plan.investmentAmountCents - spendableCents
  );

  async function activate() {
    setPending(true);
    setError(null);
    setDetail(null);

    try {
      const result = await activateInvestmentAction({ planSlug: plan.slug });

      if (result.status === "success") {
        setOpen(false);
        // Re-read everything. The balance, the position and the notification all
        // come from the server rather than being assumed here.
        router.refresh();
        router.push(result.redirectTo ?? appRoutes.investments);
        return;
      }

      setError(result.message);
      setDetail(
        result.status === "error" ? (result.fieldErrors?.amount ?? null) : null
      );
    } catch (caught) {
      console.error("[InvestmentActivationPanel] failed", caught);
      setError(
        "We couldn't reach the server. Nothing was created and your balance is unchanged."
      );
    } finally {
      setPending(false);
    }
  }

  /* ------------------------------------------------- activation switched off */

  if (!activationEnabled) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex gap-2.5 rounded-xl border border-hairline bg-surface-1 p-3.5">
          <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-brand" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            This plan is not open for investment. Nothing is committed by viewing
            it, and no investment exists on your account until you activate one.
          </p>
        </div>
        <Button asChild variant="hairline" size="md" className="w-full">
          <Link href={appRoutes.invest}>Browse other plans</Link>
        </Button>
      </div>
    );
  }

  /* ------------------------------------------------------ insufficient funds */

  if (!fundsAvailable) {
    return (
      <div className="flex flex-col gap-3">
        <div
          role="status"
          className="flex flex-col items-center gap-2.5 rounded-xl border border-destructive/25 bg-destructive-surface p-5 text-center"
        >
          <span
            aria-hidden="true"
            className="grid size-10 place-items-center rounded-xl border border-hairline bg-surface-1 text-destructive"
          >
            <AlertTriangle className="size-4" />
          </span>
          <p className="text-sm font-semibold">Insufficient wallet balance.</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            This plan needs{" "}
            <strong className="font-semibold text-foreground">
              {formatCurrency(plan.investmentAmountCents)}
            </strong>{" "}
            and{" "}
            <strong className="font-semibold text-foreground">
              {formatCurrency(spendableCents)}
            </strong>{" "}
            is available. You need a further{" "}
            <strong className="font-semibold text-foreground">
              {formatCurrency(shortfallCents)}
            </strong>
            .
          </p>
        </div>

        <Button asChild variant="accent" size="md" className="w-full">
          <Link href={appRoutes.wallet}>
            <Wallet />
            Go to Wallet
          </Link>
        </Button>
      </div>
    );
  }

  /* ---------------------------------------------------------- ready to invest */

  return (
    <div className="flex flex-col gap-3">
      <Button
        type="button"
        variant="accent"
        size="md"
        className="w-full"
        onClick={() => setOpen(true)}
      >
        <TrendingUp />
        Start Investment
      </Button>

      <p className="text-center text-[0.7rem] text-muted-foreground">
        You&rsquo;ll review the full terms before anything is created.
      </p>

      {error && !open && (
        <p role="alert" className="text-center text-xs text-destructive">
          {error}
        </p>
      )}

      <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <DialogContent className="max-h-[88vh] gap-0 overflow-y-auto p-0 shadow-float sm:max-w-lg">
          <DialogHeader className="border-b border-hairline p-6 text-left">
            <span className="eyebrow">Confirm investment</span>
            <DialogTitle className="mt-2 text-xl font-semibold sm:text-2xl">
              {plan.name}
            </DialogTitle>
            <DialogDescription className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Review the terms below. Confirming debits your wallet immediately and
              creates an active investment on your account.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5 p-6">
            <dl className="flex flex-col gap-0 overflow-hidden rounded-xl border border-hairline">
              <ConfirmRow label="Investment plan" value={plan.name} />
              <ConfirmRow
                label="Vehicle"
                value={`${plan.vehicleModel} · ${plan.vehicleType}`}
              />
              <ConfirmRow
                label="Investment amount"
                value={formatCurrency(plan.investmentAmountCents)}
                numeric
              />
              <ConfirmRow
                label="Duration"
                value={formatDuration(plan.durationDays)}
                numeric
              />
              <ConfirmRow
                label="Weekly stated profit"
                value={formatCurrency(plan.statedWeeklyProfitCents)}
                numeric
              />
              <ConfirmRow
                label="Weekly payments"
                value={String(plan.paymentPeriods)}
                numeric
              />
              <ConfirmRow
                label="Total stated profit"
                value={formatCurrency(plan.statedTotalProfitCents)}
                numeric
              />
              <ConfirmRow
                label="Completion amount"
                value={formatCurrency(plan.completionAmountCents)}
                numeric
                emphasis
              />
            </dl>

            <div className="flex gap-2.5 rounded-xl border border-hairline bg-surface-2 p-3.5">
              <ShieldCheck
                aria-hidden="true"
                className="mt-0.5 size-3.5 shrink-0 text-brand"
              />
              <p className="text-[0.7rem] leading-relaxed text-muted-foreground">
                {formatCurrency(plan.investmentAmountCents)} will be debited from
                your available balance. The figures above are the plan&rsquo;s
                stated terms — each weekly payment is credited only when it is
                actually paid, and none is credited in advance.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="flex flex-col gap-1 rounded-xl border border-destructive/25 bg-destructive-surface p-3.5"
              >
                <p className="text-xs font-semibold text-foreground">{error}</p>
                {detail && (
                  <p className="text-[0.7rem] leading-relaxed text-muted-foreground">
                    {detail}
                  </p>
                )}
                {error.startsWith("Insufficient") && (
                  <Button
                    asChild
                    variant="hairline"
                    size="sm"
                    className="mt-1.5 self-start"
                  >
                    <Link href={appRoutes.wallet}>
                      <Wallet />
                      Go to Wallet
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 border-t border-hairline p-6 sm:gap-3">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="accent"
              size="md"
              onClick={activate}
              disabled={pending}
            >
              {pending ? <BrandedSpinner /> : <CheckCircle2 />}
              {pending
                ? "Activating…"
                : `Confirm ${formatCurrency(plan.investmentAmountCents, {
                    compactDecimals: true,
                  })}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ConfirmRow({
  label,
  value,
  numeric = false,
  emphasis = false,
}: {
  label: string;
  value: string;
  numeric?: boolean;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-hairline px-4 py-3 last:border-b-0 even:bg-surface-2/60">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        {...(numeric ? { "data-numeric": "" } : {})}
        className={
          emphasis
            ? "text-sm font-semibold text-brand-emphasis"
            : "text-sm font-semibold text-foreground"
        }
      >
        {value}
      </dd>
    </div>
  );
}

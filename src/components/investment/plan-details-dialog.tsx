"use client";

import * as React from "react";
import { CalendarClock, ShieldAlert } from "lucide-react";

import { PlanTermsList } from "@/components/investment/plan-terms-list";
import {
  PlanStatusPill,
  StatusPill,
} from "@/components/common/status-pill";
import {
  getPlanSchedule,
  getPlanTerms,
} from "@/components/investment/plan-terms";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { InvestmentPlan } from "@/types/investment";

type PlanDetailsDialogProps = {
  plan: InvestmentPlan;
  trigger: React.ReactNode;
};

/**
 * Full term sheet for a plan, as a dialog.
 *
 * Used on the *public* landing page, where `/invest/[slug]` is behind the auth
 * guard and a visitor should be able to read the terms before creating an
 * account. Inside the app, the same content is a real page at
 * `src/app/(app)/invest/[slug]/page.tsx`.
 *
 * The payment schedule here is the plan's *proposed* division of its term. Every
 * period is labelled `Scheduled` because no period has ever been paid — this is a
 * specification, not a statement of account.
 */
export function PlanDetailsDialog({ plan, trigger }: PlanDetailsDialogProps) {
  const terms = getPlanTerms(plan);
  const schedule = getPlanSchedule(plan);

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent className="max-h-[88vh] gap-0 overflow-y-auto p-0 shadow-float sm:max-w-2xl">
        <DialogHeader className="border-b border-hairline p-6 text-left sm:p-7">
          <div className="flex flex-wrap items-center gap-3">
            <span className="eyebrow">{plan.vehicleType}</span>
            <PlanStatusPill status={plan.status} />
          </div>
          <DialogTitle className="mt-3 text-2xl font-semibold sm:text-[1.75rem]">
            {plan.name}
          </DialogTitle>
          <DialogDescription className="mt-1.5 text-sm leading-relaxed text-muted-foreground text-pretty">
            {plan.summary}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-8 p-6 sm:p-7">
          <section className="flex flex-col gap-4">
            <h3 className="eyebrow">Stated terms</h3>
            <PlanTermsList terms={terms} layout="grid" />
          </section>

          <section className="flex flex-col gap-4 border-t border-hairline pt-7">
            <div className="flex items-center gap-2.5">
              <CalendarClock aria-hidden="true" className="size-4 text-brand" />
              <h3 className="eyebrow">Proposed payment schedule</h3>
            </div>

            <ul className="flex flex-col divide-y divide-hairline overflow-hidden rounded-xl border border-hairline">
              {schedule.map((period) => (
                <li
                  key={period.index}
                  className="flex items-center justify-between gap-4 bg-surface-1 px-4 py-3.5"
                >
                  <span className="text-sm text-muted-foreground">
                    {period.label}
                  </span>
                  <span className="flex items-center gap-3">
                    <span data-numeric className="text-sm font-semibold">
                      {period.amount}
                    </span>
                    <StatusPill tone="neutral">{period.state}</StatusPill>
                  </span>
                </li>
              ))}
            </ul>

            <p className="text-xs leading-relaxed text-muted-foreground">
              Every period reads{" "}
              <span className="font-medium text-foreground">Scheduled</span>{" "}
              because the plan is not active and no payment has been made. This
              table describes how the term would be divided.
            </p>
          </section>

          <PlanRiskNotice />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The stated-terms disclosure.
 *
 * Exported so the plan card, the dialog and the plan detail page all carry the
 * identical wording — a required disclosure that varies by surface isn't reliable.
 */
export function PlanRiskNotice({ className }: { className?: string }) {
  return (
    <section
      className={
        className ??
        "flex gap-3.5 rounded-xl border border-warning/25 bg-warning-surface p-4 sm:p-5"
      }
    >
      <ShieldAlert
        aria-hidden="true"
        className="mt-0.5 size-4.5 shrink-0 text-warning"
      />
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-semibold text-foreground">
          Stated terms, not a guarantee
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          These figures describe what the plan proposes to pay if it performs as
          published. They are not a guarantee or warranty of profit, are not
          risk-free, and are not covered by any deposit-insurance or
          investor-compensation scheme. Investing carries risk, including loss of
          the capital you commit. Nothing here is financial, investment, tax or
          legal advice.
        </p>
      </div>
    </section>
  );
}

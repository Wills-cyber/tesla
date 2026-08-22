"use client";

import * as React from "react";
import { CalendarClock, ShieldAlert } from "lucide-react";

import { PlanTermsList } from "@/components/investment/plan-terms-list";
import { PlanStatusPill } from "@/components/common/status-pill";
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
import { StatusPill } from "@/components/common/status-pill";
import type { InvestmentPlan } from "@/types/investment";

type PlanDetailsDialogProps = {
  plan: InvestmentPlan;
  trigger: React.ReactNode;
};

/**
 * Full term sheet for a plan.
 *
 * The payment schedule here is the plan's *proposed* division of its term. Every
 * period is labelled `Scheduled` because no period has ever been paid — this is
 * a specification, not a statement of account.
 */
export function PlanDetailsDialog({ plan, trigger }: PlanDetailsDialogProps) {
  const terms = getPlanTerms(plan);
  const schedule = getPlanSchedule(plan);

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent className="max-h-[88vh] gap-0 overflow-y-auto border-white/10 bg-ink-900/95 p-0 backdrop-blur-2xl sm:max-w-2xl">
        <DialogHeader className="border-b border-white/8 p-6 text-left sm:p-7">
          <div className="flex flex-wrap items-center gap-3">
            <span className="eyebrow">{plan.vehicleType}</span>
            <PlanStatusPill status={plan.status} />
          </div>
          <DialogTitle className="mt-3 text-2xl font-medium sm:text-[1.75rem]">
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

          <section className="flex flex-col gap-4 border-t border-white/8 pt-7">
            <div className="flex items-center gap-2.5">
              <CalendarClock aria-hidden="true" className="size-4 text-gold-300" />
              <h3 className="eyebrow">Proposed payment schedule</h3>
            </div>

            <ul className="flex flex-col divide-y divide-white/6 overflow-hidden rounded-xl border border-white/8">
              {schedule.map((period) => (
                <li
                  key={period.index}
                  className="flex items-center justify-between gap-4 px-4 py-3.5"
                >
                  <span className="text-sm text-muted-foreground">
                    {period.label}
                  </span>
                  <span className="flex items-center gap-3">
                    <span data-numeric className="text-sm font-medium">
                      {period.amount}
                    </span>
                    <StatusPill tone="neutral">{period.state}</StatusPill>
                  </span>
                </li>
              ))}
            </ul>

            <p className="text-xs leading-relaxed text-muted-foreground/70">
              Every period reads <span className="text-muted-foreground">Scheduled</span>{" "}
              because the plan is not active and no payment has been made. This
              table describes how the term would be divided.
            </p>
          </section>

          <section className="flex gap-3.5 rounded-xl border border-amber-400/20 bg-amber-400/[0.04] p-4 sm:p-5">
            <ShieldAlert
              aria-hidden="true"
              className="mt-0.5 size-4.5 shrink-0 text-amber-200/90"
            />
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium text-amber-100">
                Stated terms, not a guarantee
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                These figures describe what the plan proposes to pay if it
                performs as published. They are not a guarantee or warranty of
                profit and are not covered by any deposit-insurance or
                investor-compensation scheme. Investing carries risk, including
                loss of the capital you commit. Nothing here is financial,
                investment, tax or legal advice.
              </p>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

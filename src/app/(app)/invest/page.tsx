import type { Metadata } from "next";
import Link from "next/link";
import { Info, Wallet } from "lucide-react";

import { InvestMarketplace } from "@/components/investment/invest-marketplace";
import { PlanRiskNotice } from "@/components/investment/plan-details-dialog";
import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { appRoutes } from "@/config/navigation";
import { getAccountMode, isPreviewMode } from "@/lib/auth/session";
import { getInvestmentPlans, resolveOrEmpty } from "@/lib/data";

export const metadata: Metadata = {
  title: "Invest",
  description: "Every available TESLA Electronics investment plan.",
  robots: { index: false, follow: false },
};

/**
 * Investment marketplace with premium header.
 */
export default async function InvestPage() {
  const account = await getAccountMode();
  const preview = isPreviewMode(account);

  const { data: plans, error } = resolveOrEmpty(await getInvestmentPlans(), []);

  return (
    <>
      <div className="flex flex-col gap-3">
        <p className="eyebrow text-brand-emphasis">Invest</p>
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.025em] sm:text-[2.25rem]">
              Investment plans
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">
              Every plan published on the platform, with its full stated terms.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            {preview && (
              <StatusPill tone="brand" dot className="self-start">
                UI Preview · No account connected
              </StatusPill>
            )}
            <Button asChild variant="hairline" size="md">
              <Link href={appRoutes.wallet}>
                <Wallet />
                Open Wallet
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-destructive/25 bg-destructive-surface p-5 text-sm text-foreground"
        >
          {error}
        </div>
      )}

      <InvestMarketplace plans={plans} />

      <div className="panel-tint tint-brand flex gap-3 p-4 sm:p-5">
        <Info aria-hidden="true" className="tint-ink mt-0.5 size-4 shrink-0" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Every plan here is available to activate. Activation debits your
          available wallet balance immediately and creates an investment on your
          account. Weekly profit is credited only when a payment is actually
          made, never in advance.
        </p>
      </div>

      <PlanRiskNotice />
    </>
  );
}
import type { Metadata } from "next";
import Link from "next/link";
import { Info, Wallet } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
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
 * The investment marketplace.
 *
 * Holds *every* available plan and nothing else — no positions, no balances. Plans
 * are read from the `investment_plans` table, so publishing a new one is inserting
 * a row: no code change, no redeploy. The filters in `InvestMarketplace` derive
 * their options from the returned data for the same reason.
 *
 * An error here is surfaced rather than swallowed, because an empty marketplace and
 * a failed marketplace look identical and mean very different things.
 */
export default async function InvestPage() {
  const account = await getAccountMode();
  const preview = isPreviewMode(account);

  const { data: plans, error } = resolveOrEmpty(await getInvestmentPlans(), []);

  return (
    <>
      <PageHeader
        eyebrow="Invest"
        title="Investment plans"
        description="Every plan published on the platform, with its full stated terms. Open a plan to see its payment schedule period by period."
        badge={
          preview ? (
            <StatusPill tone="brand" dot className="self-start">
              UI Preview · No account connected
            </StatusPill>
          ) : null
        }
        actions={
          <Button asChild variant="hairline" size="md">
            <Link href={appRoutes.wallet}>
              <Wallet />
              Open Wallet
            </Link>
          </Button>
        }
      />

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-destructive/25 bg-destructive-surface p-5 text-sm text-foreground"
        >
          {error}
        </div>
      )}

      {/* Rendered whenever there are plans to show, error or not. `error` here is
          advisory: the plan repository falls back to the published catalogue when
          the query fails, so the grid below is still correct and an error banner
          on its own must never be the whole page. `InvestMarketplace` renders its
          own empty state when the list really is empty. */}
      <InvestMarketplace plans={plans} />

      <div className="flex gap-3 rounded-2xl border border-hairline bg-surface-2 p-4 sm:p-5">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          No plan can be funded at the moment. Activation requires an available
          wallet balance, and deposits will open only once payment processing,
          account verification and the required compliance review are complete.
        </p>
      </div>

      <PlanRiskNotice />
    </>
  );
}

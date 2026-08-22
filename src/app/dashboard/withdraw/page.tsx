import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpFromLine } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { ComingSoonPanel } from "@/components/common/coming-soon-panel";
import { Button } from "@/components/ui/button";
import { featureFlags } from "@/config/site";

export const metadata: Metadata = {
  title: "Withdraw",
  description: "Withdrawal availability on TESLA Electronics.",
  robots: { index: false, follow: false },
};

/**
 * Withdrawal interface.
 *
 * As with deposits: no form, no amount field, no payout rail. Because no funds
 * have ever been held on the platform, there is also nothing to withdraw — this
 * page states that plainly rather than presenting a request form that would
 * always fail.
 */
export default function DashboardWithdrawPage() {
  if (featureFlags.withdrawalsEnabled) {
    // Intentionally unreachable today — the real flow replaces this branch.
    throw new Error(
      "Withdrawals are flagged as enabled but no withdrawal flow is implemented."
    );
  }

  return (
    <>
      <PageHeader
        title="Withdraw"
        description="Request a payout from your available balance."
      />

      <ComingSoonPanel
        title="Withdrawals Coming Soon"
        icon={ArrowUpFromLine}
        description="Withdrawals are not available yet. No funds are held on the platform, so there is nothing to withdraw and no request can be submitted."
        requirements={[
          "Payout rails integrated and tested end to end",
          "Account verification (KYC) in place",
          "Compliance and regulatory review completed",
          "Withdrawal approval and audit trail connected",
        ]}
        footnote="Withdrawals will follow the same schedule as deposits. Any change will be announced in your dashboard notifications."
      />

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="hairline" size="md">
          <Link href="/dashboard/transactions">View transactions</Link>
        </Button>
        <Button
          asChild
          variant="ghost"
          size="md"
          className="text-muted-foreground hover:text-foreground"
        >
          <Link href="/dashboard/deposit">Deposit status</Link>
        </Button>
      </div>
    </>
  );
}

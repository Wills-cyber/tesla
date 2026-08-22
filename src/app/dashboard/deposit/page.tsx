import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownToLine } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { ComingSoonPanel } from "@/components/common/coming-soon-panel";
import { Button } from "@/components/ui/button";
import { featureFlags } from "@/config/site";

export const metadata: Metadata = {
  title: "Deposit",
  description: "Deposit availability on TESLA Electronics.",
  robots: { index: false, follow: false },
};

/**
 * Deposit interface.
 *
 * There is deliberately no form, no amount field and no payment provider on this
 * page. An input that looks functional but leads nowhere is worse than an honest
 * "not yet" — and a disabled form still invites someone to try. Nothing here can
 * change a balance.
 *
 * When funding is genuinely ready, flip `featureFlags.depositsEnabled` and render
 * the real flow in place of this panel.
 */
export default function DashboardDepositPage() {
  if (featureFlags.depositsEnabled) {
    // Intentionally unreachable today — the real flow replaces this branch.
    throw new Error(
      "Deposits are flagged as enabled but no deposit flow is implemented."
    );
  }

  return (
    <>
      <PageHeader
        title="Deposit"
        description="Add funds to your account balance."
      />

      <ComingSoonPanel
        title="Deposits Coming Soon"
        icon={ArrowDownToLine}
        description="Funding is not available yet. No payment provider is connected to this platform, and no deposit can be made or recorded."
        requirements={[
          "Payment processing integrated and tested end to end",
          "Account verification (KYC) in place",
          "Compliance and regulatory review completed",
          "Supabase ledger and audit trail connected",
        ]}
        footnote="We would rather leave this switched off than accept funds through an unfinished system. When deposits open, it will be announced in your notifications."
      />

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="hairline" size="md">
          <Link href="/dashboard/investments">Review plan terms</Link>
        </Button>
        <Button
          asChild
          variant="ghost"
          size="md"
          className="text-muted-foreground hover:text-foreground"
        >
          <Link href="/dashboard/notifications">Notification settings</Link>
        </Button>
      </div>
    </>
  );
}

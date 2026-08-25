import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";

import { AdminDepositReview } from "@/components/admin/admin-deposit-review";
import { EmptyState } from "@/components/common/empty-state";
import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { ADMIN_USER_ID } from "@/config/crypto";
import { appRoutes, authRoutes } from "@/config/navigation";
import { getAccountMode, getAccountUser, isPreviewMode } from "@/lib/auth/session";
import { getAdminDeposits, getIsAdmin, resolveOrEmpty } from "@/lib/data";

export const metadata: Metadata = {
  title: "Admin Deposit Reviews",
  description: "Review pending USDT deposits.",
  robots: { index: false, follow: false },
};

export default async function AdminDepositsPage() {
  const account = await getAccountMode();
  if (account.mode === "anonymous") {
    redirect(authRoutes.login);
  }

  const user = getAccountUser(account);
  const preview = isPreviewMode(account);
  const { data: isAdmin } = resolveOrEmpty(await getIsAdmin(), false);

  const isDesignatedAdmin = user?.id === ADMIN_USER_ID;
  const authorized = preview || isAdmin || isDesignatedAdmin;

  if (!authorized) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <EmptyState
          icon={ShieldAlert}
          size="lg"
          title="Admin Area Restricted"
          description="Only authorized platform administrators can access this area."
          action={
            <Button asChild variant="hairline" size="md">
              <Link href={appRoutes.dashboard}>Return to Dashboard</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const depositsResult = await getAdminDeposits();
  const { data: deposits } = resolveOrEmpty(depositsResult, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="eyebrow text-brand-emphasis">Admin</p>
          <StatusPill tone="info" dot>
            Administrator
          </StatusPill>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Deposit Reviews
        </h1>
        <p className="text-sm text-muted-foreground">
          Review incoming payment proofs and approve balance credits.
        </p>
      </div>

      <AdminDepositReview deposits={deposits} />
    </div>
  );
}

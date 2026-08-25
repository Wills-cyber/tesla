import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";

import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { ADMIN_USER_ID } from "@/config/crypto";
import { appRoutes, authRoutes } from "@/config/navigation";
import { getAccountMode, getAccountUser, isPreviewMode } from "@/lib/auth/session";
import { getAdminDeposits, getIsAdmin, resolveOrEmpty } from "@/lib/data";

export const metadata: Metadata = {
  title: "Admin Panel",
  description: "Platform Administration and Deposit Reviews.",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
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
          description="Only authorized platform administrators can access this area. Your account does not have administrative privileges."
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

  return <AdminDashboard user={user} deposits={deposits} />;
}

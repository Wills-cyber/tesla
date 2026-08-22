import type { Metadata } from "next";
import { BellOff } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { NotificationList } from "@/components/dashboard/notification-list";
import { StatusPill } from "@/components/common/status-pill";
import { getAccountMode, isPreviewMode } from "@/lib/auth/session";
import { getUserNotifications, resolveOrEmpty } from "@/lib/data";

export const metadata: Metadata = {
  title: "Notifications",
  description: "Platform and account updates.",
  robots: { index: false, follow: false },
};

export default async function DashboardNotificationsPage() {
  const account = await getAccountMode();
  const preview = isPreviewMode(account);

  const { data: notifications, error } = resolveOrEmpty(
    await getUserNotifications(),
    []
  );

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Account activity and platform announcements, including when deposits and withdrawals open."
        badge={
          preview ? (
            <StatusPill tone="gold" dot className="self-start">
              UI Preview · No account connected
            </StatusPill>
          ) : null
        }
      />

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-destructive/25 bg-destructive/[0.06] p-5 text-sm text-red-100"
        >
          {error}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title="No Notifications"
          description="You have no notifications."
          note="When deposits and withdrawals become available, the announcement will arrive here first."
        />
      ) : (
        <NotificationList notifications={notifications} />
      )}
    </>
  );
}

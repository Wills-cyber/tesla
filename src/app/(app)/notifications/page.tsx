import type { Metadata } from "next";
import Link from "next/link";
import { BellOff } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { NotificationList } from "@/components/dashboard/notification-list";
import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { appRoutes } from "@/config/navigation";
import { getAccountMode, isPreviewMode } from "@/lib/auth/session";
import { getUserNotifications, resolveOrEmpty } from "@/lib/data";

export const metadata: Metadata = {
  title: "Notifications",
  description: "Account and platform updates.",
  robots: { index: false, follow: false },
};

/**
 * Notifications.
 *
 * Reachable from the top bar and from Profile, deliberately not from the bottom
 * navigation — five primary areas is the practical ceiling on a phone, and a
 * notification feed is something you visit when prompted rather than a place you
 * navigate to.
 */
export default async function NotificationsPage() {
  const account = await getAccountMode();
  const preview = isPreviewMode(account);

  const { data: notifications, error } = resolveOrEmpty(
    await getUserNotifications(),
    []
  );

  return (
    <>
      <PageHeader
        eyebrow="Notifications"
        title="Notifications"
        description="Account activity and platform announcements, including when deposits and withdrawals open."
        badge={
          preview ? (
            <StatusPill tone="brand" dot className="self-start">
              UI Preview · No account connected
            </StatusPill>
          ) : null
        }
        actions={
          <Button asChild variant="ghost" size="md">
            <Link href={`${appRoutes.profile}#notifications`}>Preferences</Link>
          </Button>
        }
      />

      {error ? (
        <div
          role="alert"
          className="rounded-2xl border border-destructive/25 bg-destructive-surface p-5 text-sm text-foreground"
        >
          {error}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={BellOff}
          size="lg"
          title="You're all caught up"
          description="You have no notifications."
          note="When deposits and withdrawals become available, the announcement will arrive here first."
          action={
            <Button asChild variant="hairline" size="md">
              <Link href={appRoutes.dashboard}>Back to dashboard</Link>
            </Button>
          }
        />
      ) : (
        <NotificationList notifications={notifications} />
      )}
    </>
  );
}

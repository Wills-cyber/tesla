import type { Metadata } from "next";
import Link from "next/link";
import { BellOff } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { MarkAllReadButton } from "@/components/dashboard/mark-all-read-button";
import { NotificationFeed } from "@/components/dashboard/notification-feed";
import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { appRoutes } from "@/config/navigation";
import { getAccountMode, isPreviewMode } from "@/lib/auth/session";
import {
  EMPTY_NOTIFICATION_PAGE,
  type NotificationPage,
} from "@/types/notification";
import { getUnreadNotificationCount, getUserNotifications, resolveOrEmpty } from "@/lib/data";

export const metadata: Metadata = {
  title: "Notifications",
  description: "Account and platform updates.",
  robots: { index: false, follow: false },
};

/**
 * Notifications page — premium header.
 */
export default async function NotificationsPage() {
  const account = await getAccountMode();
  const preview = isPreviewMode(account);

  const [pageResult, unreadResult] = await Promise.all([
    getUserNotifications(),
    getUnreadNotificationCount(),
  ]);

  const { data: page, error } = resolveOrEmpty<NotificationPage>(
    pageResult,
    EMPTY_NOTIFICATION_PAGE
  );
  const { data: unreadCount } = resolveOrEmpty(unreadResult, 0);

  return (
    <>
      <div className="flex flex-col gap-3">
        <p className="eyebrow text-brand-emphasis">Notifications</p>
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.025em] sm:text-[2.25rem]">
              Notifications
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">
              Account activity and platform announcements.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            {preview && (
              <StatusPill tone="brand" dot className="self-start">
                UI Preview · No account connected
              </StatusPill>
            )}
            {!preview && <MarkAllReadButton unreadCount={unreadCount} />}
            <Button asChild variant="ghost" size="md">
              <Link href={`${appRoutes.profile}#notifications`}>Preferences</Link>
            </Button>
          </div>
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-2xl border border-destructive/25 bg-destructive-surface p-5 text-sm text-foreground"
        >
          {error}
        </div>
      ) : page.items.length === 0 ? (
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
        <NotificationFeed
          initialNotifications={page.items}
          initialCursor={page.nextCursor}
          initialHasMore={page.hasMore}
        />
      )}
    </>
  );
}
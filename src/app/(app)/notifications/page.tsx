import type { Metadata } from "next";
import Link from "next/link";
import { BellOff } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorBanner } from "@/components/common/error-banner";
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
 * Notifications.
 *
 * Reachable from the top bar and from Profile, deliberately not from the bottom
 * navigation — five primary areas is the practical ceiling on a phone, and a
 * notification feed is something you visit when prompted rather than a place you
 * navigate to.
 *
 * The page renders only the first page (20 rows) server-side; the client feed
 * loads older rows on demand with a keyset cursor, so an account with years of
 * history never ships them all at once. New notifications still arrive through
 * the realtime provider — a toast, an updated badge, and a route refresh — while
 * this page is open.
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
  // The exact unread count comes from the server (a head count), not from the
  // first page, so the "mark all" label is truthful however many rows are loaded.
  const { data: unreadCount } = resolveOrEmpty(unreadResult, 0);

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
          <div className="flex flex-wrap items-center gap-2">
            {!preview && <MarkAllReadButton unreadCount={unreadCount} />}
            <Button asChild variant="ghost" size="md">
              <Link href={`${appRoutes.profile}#notifications`}>Preferences</Link>
            </Button>
          </div>
        }
      />

      {error ? (
        <ErrorBanner message={error} />
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

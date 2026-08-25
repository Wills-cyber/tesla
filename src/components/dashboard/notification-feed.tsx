"use client";

import * as React from "react";

import { BrandedSpinner } from "@/components/brand/branded-loader";
import { NotificationList } from "@/components/dashboard/notification-list";
import { Button } from "@/components/ui/button";
import { loadNotificationsPageAction } from "@/lib/notifications/actions";
import type { Notification } from "@/types/notification";

/**
 * Paginated notification feed.
 *
 * The first page is rendered by the server (20 rows, keyset-cursor); this
 * component holds only the *already-loaded* pages, so a busy account never ships
 * a thousand rows to the browser at once. The display list is derived from the
 * server page merged with the loaded pages, so the realtime provider refreshing
 * the route keeps the first page (and its read state) current without resetting
 * pagination progress.
 *
 * Cursors are opaque and generated from the last row of each page, so new
 * notifications arriving between page loads cannot shift the window and
 * duplicate or skip rows.
 */
export function NotificationFeed({
  initialNotifications,
  initialCursor,
  initialHasMore,
}: {
  initialNotifications: Notification[];
  initialCursor: string | null;
  initialHasMore: boolean;
}) {
  /** Rows beyond the server's first page, loaded on demand. */
  const [loaded, setLoaded] = React.useState<Notification[]>([]);
  const [cursor, setCursor] = React.useState<string | null>(initialCursor);
  const [hasMore, setHasMore] = React.useState(initialHasMore);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const items = React.useMemo(() => {
    const merged = new Map<string, Notification>();
    for (const notification of initialNotifications) {
      merged.set(notification.id, notification);
    }
    for (const notification of loaded) {
      if (!merged.has(notification.id)) {
        merged.set(notification.id, notification);
      }
    }
    return [...merged.values()];
  }, [initialNotifications, loaded]);

  async function loadMore() {
    setLoading(true);
    setError(null);

    try {
      const result = await loadNotificationsPageAction(cursor);
      if (result.error) {
        setError(result.error);
        return;
      }

      setLoaded((current) => {
        const known = new Set(current.map((item) => item.id));
        const fresh = result.items.filter((item) => !known.has(item.id));
        // Never load rows already shown by the server's first page either.
        const firstPageIds = new Set(
          initialNotifications.map((item) => item.id)
        );
        return [...current, ...fresh.filter((item) => !firstPageIds.has(item.id))];
      });
      setCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } catch (caught) {
      console.error("[NotificationFeed] load more failed", caught);
      setError("We couldn't load more notifications. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <NotificationList notifications={items} showMarkRead />

      {hasMore && (
        <div className="flex flex-col items-center gap-2 self-center">
          <Button
            type="button"
            variant="hairline"
            size="md"
            onClick={() => void loadMore()}
            disabled={loading}
          >
            {loading ? <BrandedSpinner /> : null}
            {loading ? "Loading…" : "Load more notifications"}
          </Button>
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

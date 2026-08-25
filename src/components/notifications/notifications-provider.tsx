"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

import { Bell } from "lucide-react";

import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/lib/notifications/actions";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Notification, NotificationCategory, NotificationData, NotificationType } from "@/types/notification";

/**
 * Realtime notification provider.
 *
 * One subscription per signed-in tab, mounted in the authenticated app shell:
 *
 *   · It fetches the latest page once on mount (RLS-scoped, unexpired rows) and
 *     then only reacts to realtime events. There is no polling.
 *   · INSERT / UPDATE / DELETE events for the signed-in user's rows are applied
 *     to local state, so the bell badge, the dropdown and the toast do not wait
 *     for a server round trip.
 *   · A toast is shown only for notifications that arrive *after* initial
 *     hydration, and each id is toasted at most once — the page load can never
 *     burst toasts, and a replayed message cannot toast twice.
 *   · Unmounting (including sign-out, which unmounts the whole app shell) always
 *     removes the channel.
 *
 * RLS is the access control; the `user_id` filter on the channel is a bandwidth
 * optimisation. The database, not this component, decides what a subscriber may
 * see.
 */

const PROVIDER_LIMIT = 50;
const TOAST_DEDUPE_LIMIT = 100;
const REFRESH_DEBOUNCE_MS = 300;

type NotificationsState = {
  notifications: Notification[];
  unreadCount: number;
};

type NotificationsAction =
  | {
      type: "hydrate";
      notifications: Notification[];
      unreadCount: number;
      /** Events that arrived during the initial fetch, already deduped. */
      buffered: Notification[];
    }
  | { type: "insert"; notification: Notification }
  | { type: "update"; notification: Notification }
  | { type: "delete"; id: string }
  | { type: "markRead"; id: string }
  | { type: "markAllRead" }
  | { type: "replace"; notifications: Notification[]; unreadCount: number };

/** Pure reducer: the source of truth is the database, this is only its mirror. */
function notificationsReducer(
  state: NotificationsState,
  action: NotificationsAction
): NotificationsState {
  switch (action.type) {
    case "hydrate": {
      const fetchedIds = new Set(
        action.notifications.map((notification) => notification.id)
      );
      // Anything already in the fetched page is dropped (it was part of the page
      // load), the rest is prepended and counted — silently, without a toast.
      const newItems = action.buffered.filter(
        (notification) => !fetchedIds.has(notification.id)
      );
      const newUnread = newItems.filter((notification) => !notification.isRead).length;

      return {
        notifications: [...newItems, ...action.notifications].slice(0, PROVIDER_LIMIT),
        unreadCount: action.unreadCount + newUnread,
      };
    }
    case "insert": {
      if (state.notifications.some((item) => item.id === action.notification.id)) {
        return state;
      }
      return {
        notifications: [action.notification, ...state.notifications].slice(
          0,
          PROVIDER_LIMIT
        ),
        unreadCount:
          state.unreadCount + (action.notification.isRead ? 0 : 1),
      };
    }
    case "update": {
      const index = state.notifications.findIndex(
        (item) => item.id === action.notification.id
      );
      if (index === -1) return state;

      const previous = state.notifications[index];
      if (previous.isRead === action.notification.isRead) {
        // Metadata-only change; the count cannot move.
        const next = [...state.notifications];
        next[index] = action.notification;
        return { ...state, notifications: next };
      }

      const next = [...state.notifications];
      next[index] = action.notification;
      return {
        notifications: next,
        unreadCount: Math.max(
          0,
          state.unreadCount + (action.notification.isRead ? -1 : 1)
        ),
      };
    }
    case "delete": {
      const deleted = state.notifications.find((item) => item.id === action.id);
      return {
        notifications: state.notifications.filter(
          (item) => item.id !== action.id
        ),
        // The realtime DELETE payload usually carries only the primary key, so
        // whether the row was unread is recovered from local state — the count
        // never goes negative.
        unreadCount: Math.max(
          0,
          state.unreadCount - (deleted && !deleted.isRead ? 1 : 0)
        ),
      };
    }
    case "markRead": {
      const index = state.notifications.findIndex((item) => item.id === action.id);
      if (index === -1 || state.notifications[index].isRead) return state;

      const next = [...state.notifications];
      next[index] = {
        ...next[index],
        isRead: true,
        readAt: next[index].readAt ?? new Date().toISOString(),
      };
      return { notifications: next, unreadCount: Math.max(0, state.unreadCount - 1) };
    }
    case "markAllRead": {
      const now = new Date().toISOString();
      return {
        notifications: state.notifications.map((item) =>
          item.isRead ? item : { ...item, isRead: true, readAt: now }
        ),
        unreadCount: 0,
      };
    }
    case "replace":
      return {
        notifications: action.notifications.slice(0, PROVIDER_LIMIT),
        unreadCount: action.unreadCount,
      };
  }
}

type NotificationsContextValue = {
  /** Latest notifications, newest first. Capped at 50 in local state. */
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  /** Re-reads the feed and count from the server. */
  refreshNotifications: () => Promise<void>;
};

const NotificationsContext = React.createContext<NotificationsContextValue | null>(
  null
);

export function useNotifications(): NotificationsContextValue {
  const context = React.useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotifications must be used inside <NotificationsProvider>.");
  }
  return context;
}

function parseNotificationData(value: unknown): NotificationData {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as NotificationData;
  }
  return {};
}

type RealtimeRecord = { [key: string]: unknown };

function mapPayloadRow(row: RealtimeRecord): Notification | null {
  if (typeof row.id !== "string" || typeof row.user_id !== "string") return null;

  const readAt = typeof row.read_at === "string" ? row.read_at : null;

  return {
    id: row.id,
    userId: row.user_id,
    type: (row.type as NotificationType) ?? "system",
    category: (row.category as NotificationCategory) ?? "platform",
    title: typeof row.title === "string" ? row.title : "Notification",
    body: typeof row.body === "string" ? row.body : "",
    href: typeof row.href === "string" ? row.href : null,
    readAt,
    isRead: Boolean(row.is_read ?? (readAt !== null)),
    createdAt:
      typeof row.created_at === "string"
        ? row.created_at
        : new Date().toISOString(),
    expiresAt: typeof row.expires_at === "string" ? row.expires_at : null,
    data: parseNotificationData(row.data),
  };
}

export function NotificationsProvider({
  userId,
  initialUnreadCount,
  children,
}: {
  userId: string | null;
  /** SSR value from the layout, so the badge is correct before hydration. */
  initialUnreadCount: number;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [state, dispatch] = React.useReducer(notificationsReducer, {
    notifications: [],
    unreadCount: initialUnreadCount,
  });
  const [loading, setLoading] = React.useState(false);

  /** True once the initial fetch is complete; toasts start only after this. */
  const hydratedRef = React.useRef(false);
  /** INSERT events that arrived while the first fetch was in flight. */
  const hydrationBufferRef = React.useRef<Map<string, Notification>>(new Map());
  /** Ids already toasted, so nothing can toast twice. */
  const toastedIdsRef = React.useRef(new Set<string>());
  const refreshTimerRef = React.useRef<number | undefined>(undefined);

  const scheduleRouteRefresh = React.useCallback(() => {
    window.clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = window.setTimeout(() => {
      router.refresh();
    }, REFRESH_DEBOUNCE_MS);
  }, [router]);

  const refreshNotifications = React.useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !userId) return;

    setLoading(true);
    try {
      const [listResult, countResult] = await Promise.all([
        supabase
          .from("notifications")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(PROVIDER_LIMIT),
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .is("read_at", null),
      ]);

      const fetched = (listResult.data ?? [])
        .map((row) => mapPayloadRow(row as unknown as RealtimeRecord))
        .filter((item): item is Notification => item !== null);

      dispatch({
        type: "replace",
        notifications: fetched,
        unreadCount: countResult.error
          ? fetched.filter((item) => !item.isRead).length
          : (countResult.count ?? 0),
      });
    } catch (caught) {
      console.error("[notifications:refresh]", caught);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const markAsRead = React.useCallback(
    async (id: string) => {
      // Optimistic, with the server as the authority: on failure the state is
      // re-read rather than hand-rolled back, so the badge and feed can never
      // disagree with the database for long.
      dispatch({ type: "markRead", id });
      const result = await markNotificationReadAction({ id });
      if (result.status !== "success") {
        console.error("[notifications:markAsRead]", result);
        await refreshNotifications();
      }
    },
    [refreshNotifications]
  );

  const markAllAsRead = React.useCallback(async () => {
    dispatch({ type: "markAllRead" });
    const result = await markAllNotificationsReadAction();
    if (result.status !== "success") {
      console.error("[notifications:markAllAsRead]", result);
      await refreshNotifications();
    }
  }, [refreshNotifications]);

  const showToast = React.useCallback(
    (notification: Notification) => {
      const seen = toastedIdsRef.current;
      if (seen.has(notification.id)) return;
      seen.add(notification.id);
      if (seen.size > TOAST_DEDUPE_LIMIT) {
        const oldest = seen.values().next().value;
        if (oldest !== undefined) seen.delete(oldest);
      }

      toast(notification.title, {
        description: notification.body,
        icon: <Bell className="size-4 text-brand" />,
        duration: 6000,
        action: notification.href
          ? {
              label: "View",
              onClick: () => {
                // Opening the destination counts as having read the notice.
                void markAsRead(notification.id);
                router.push(notification.href as string);
              },
            }
          : undefined,
      });
    },
    [markAsRead, router]
  );

  React.useEffect(() => {
    if (!userId) return;
    // Const alias: TypeScript does not carry parameter narrowing into the
    // closures created below, and the effect's async hydrate needs it.
    const activeUserId: string = userId;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      // Preview mode (no credentials): the shell still renders, honestly — the
      // initial `loading` value (false) is already correct, so nothing is set here.
      return;
    }
    // Const alias: same narrowing caveat as `activeUserId` for the async hydrate.
    const client = supabase;

    hydratedRef.current = false;
    hydrationBufferRef.current = new Map();

    const filter = `user_id=eq.${activeUserId}`;
    const channel = client
      .channel(`notifications-${activeUserId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter },
        (payload: RealtimePostgresChangesPayload<RealtimeRecord>) => {
          const notification = mapPayloadRow(payload.new ?? {});
          if (!notification) return;

          if (hydratedRef.current) {
            dispatch({ type: "insert", notification });
            showToast(notification);
            scheduleRouteRefresh();
          } else {
            // Race: the row may also be inside the fetch that is still running.
            // Buffer it and dedupe (latest wins) before hydration.
            hydrationBufferRef.current.set(notification.id, notification);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter },
        (payload: RealtimePostgresChangesPayload<RealtimeRecord>) => {
          const updated = mapPayloadRow(payload.new ?? {});
          if (updated) {
            dispatch({ type: "update", notification: updated });
            scheduleRouteRefresh();
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "notifications", filter },
        (payload: RealtimePostgresChangesPayload<RealtimeRecord>) => {
          const rawId = payload.old && "id" in payload.old ? payload.old.id : undefined;
          if (typeof rawId === "string") {
            dispatch({ type: "delete", id: rawId });
            scheduleRouteRefresh();
          }
        }
      )
      .subscribe();

    let cancelled = false;

    async function hydrate() {
      setLoading(true);
      try {
        const [listResult, countResult] = await Promise.all([
          client
            .from("notifications")
            .select("*")
            .eq("user_id", activeUserId)
            .order("created_at", { ascending: false })
            .order("id", { ascending: false })
            .limit(PROVIDER_LIMIT),
          client
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", activeUserId)
            .is("read_at", null),
        ]);

        if (cancelled) return;

        const fetched = (listResult.data ?? [])
          .map((row) => mapPayloadRow(row as unknown as RealtimeRecord))
          .filter((item): item is Notification => item !== null);

        hydratedRef.current = true;
        dispatch({
          type: "hydrate",
          notifications: fetched,
          unreadCount: countResult.error
            ? fetched.filter((item) => !item.isRead).length
            : (countResult.count ?? 0),
          buffered: [...hydrationBufferRef.current.values()],
        });
        hydrationBufferRef.current = new Map();
      } catch (caught) {
        if (cancelled) return;
        console.error("[notifications:hydrate]", caught);
        hydratedRef.current = true;
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void hydrate();

    return () => {
      cancelled = true;
      window.clearTimeout(refreshTimerRef.current);
      hydratedRef.current = false;
      void client.removeChannel(channel);
    };
  }, [userId, showToast, scheduleRouteRefresh, router]);

  const value = React.useMemo<NotificationsContextValue>(
    () => ({
      notifications: state.notifications,
      unreadCount: state.unreadCount,
      loading,
      markAsRead,
      markAllAsRead,
      refreshNotifications,
    }),
    [state.notifications, state.unreadCount, loading, markAsRead, markAllAsRead, refreshNotifications]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

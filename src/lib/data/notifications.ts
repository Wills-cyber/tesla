import "server-only";

/**
 * Notification read repository.
 *
 * Reads are delegated to the central notification service so there is exactly
 * one implementation of the feed query, cursor logic and row mapping — this
 * module exists only so server pages can keep importing from `@/lib/data`
 * without learning a second path.
 */
export {
  getUnreadNotificationCount,
  getUserNotifications,
  NOTIFICATION_PAGE_SIZE,
} from "@/lib/notifications/service";

export type { NotificationPage } from "@/types/notification";

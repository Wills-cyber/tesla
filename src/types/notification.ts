export type NotificationCategory =
  | "account"
  | "investment"
  | "transaction"
  | "security"
  | "platform";

export type Notification = {
  id: string;
  userId: string;
  category: NotificationCategory;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  /** Optional deep link into the dashboard. */
  href: string | null;
};

import { z } from "zod";

import { NOTIFICATION_TYPES } from "@/types/notification";

/**
 * Notification form schemas.
 *
 * Shared by the admin form (react-hook-form resolver) and the Server Action,
 * which re-validates with the same schema. The bulk of the safety, however, is
 * in the database: `admin_create_notifications` re-checks the caller against the
 * `admins` table inside Postgres and `notify_user` validates every field again.
 */

const typeField = z.enum(NOTIFICATION_TYPES, {
  message: "Choose a notification type.",
});

const titleField = z
  .string()
  .trim()
  .min(3, "Enter a short title.")
  .max(120, "Keep the title under 120 characters.");

const bodyField = z
  .string()
  .trim()
  .min(3, "Enter the notification message.")
  .max(2000, "Keep the message under 2000 characters.");

/**
 * Optional deep link. Internal paths (`/wallet`) and explicit https URLs only —
 * the same rule `notify_user` enforces in Postgres, checked here so the form can
 * explain itself.
 */
const hrefField = z
  .string()
  .trim()
  .max(300, "That link is too long.")
  .refine(
    (value) => value === "" || /^(\/|https:\/\/)/.test(value),
    "Use an in-app path (e.g. /wallet) or an https link."
  )
  .optional();

/**
 * Expiry, in days from now, as the string the form field submits. "0" or empty
 * means "never expires" and is converted to an actual timestamp in the action.
 */
const expiresInDaysField = z
  .string()
  .trim()
  .max(3, "Use a whole number of days.")
  .regex(/^\d{1,3}$/, "Use a whole number of days.")
  .optional()
  .refine(
    (value) => value === undefined || Number(value) <= 365,
    "Keep promotions under a year."
  );

export const adminNotificationSchema = z
  .object({
    type: typeField,
    audience: z.enum(["all", "selected"], {
      message: "Choose who should receive this.",
    }),
    /**
     * One address per line (commas also accepted by the action). Required when
     * the audience is `selected`; resolved to user ids server-side.
     */
    emails: z
      .string()
      .trim()
      .optional(),
    title: titleField,
    body: bodyField,
    href: hrefField,
    expiresInDays: expiresInDaysField,
  })
  .refine(
    (values) =>
      values.audience === "all" ||
      (values.emails ?? "").split("\n").filter((line) => line.trim().length > 0)
        .length > 0,
    {
      path: ["emails"],
      message: "Enter at least one recipient email.",
    }
  );

export type AdminNotificationValues = z.infer<typeof adminNotificationSchema>;

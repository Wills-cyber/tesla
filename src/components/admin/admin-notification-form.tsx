"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Send } from "lucide-react";

import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { sendAdminNotificationAction } from "@/lib/notifications/actions";
import {
  adminNotificationSchema,
  type AdminNotificationValues,
} from "@/lib/validations/notifications";
import { NOTIFICATION_TYPES } from "@/types/notification";

const typeLabels: Record<(typeof NOTIFICATION_TYPES)[number], string> = {
  auth: "Auth (account lifecycle)",
  security: "Security",
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  investment: "Investment",
  profit: "Profit",
  wallet: "Wallet",
  system: "System",
  promotion: "Promotion",
  announcement: "Announcement",
};

/**
 * Admin notification composer.
 *
 * Sends through `sendAdminNotificationAction`, which (a) re-validates with the
 * same schema, (b) resolves recipient emails to user ids inside a
 * `security definer` function, and (c) inserts through
 * `admin_create_notifications` — which re-checks the `admins` table against
 * `auth.uid()`. This component is convenience and feedback only; the boundary is
 * the database.
 */
export function AdminNotificationForm() {
  const [message, setMessage] = React.useState<{
    text: string;
    tone: "success" | "error";
  } | null>(null);

  const form = useForm<AdminNotificationValues>({
    resolver: zodResolver(adminNotificationSchema),
    defaultValues: {
      type: "system",
      audience: "all",
      emails: "",
      title: "",
      body: "",
      href: "",
      expiresInDays: "0",
    },
    mode: "onBlur",
  });

  const audience = form.watch("audience");

  const onSubmit = form.handleSubmit(async (values) => {
    setMessage(null);

    try {
      const result = await sendAdminNotificationAction(values);

      if (result.status === "success") {
        setMessage({ text: result.message ?? "Notification sent.", tone: "success" });
        form.reset();
        return;
      }

      if (result.status === "error" && result.fieldErrors) {
        for (const [field, error] of Object.entries(result.fieldErrors)) {
          form.setError(field as keyof AdminNotificationValues, {
            type: "server",
            message: error,
          });
        }
      }

      setMessage({ text: result.message, tone: "error" });
    } catch (caught) {
      console.error("[admin] send notification failed", caught);
      setMessage({
        text: "We couldn't reach the server. Nothing was sent.",
        tone: "error",
      });
    }
  });

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-6 rounded-2xl border border-hairline bg-surface-1 p-6 shadow-card"
    >
      <div className="grid gap-6 sm:grid-cols-2">
        {/* --------------------------------------------------------- audience */}
        <fieldset className="flex flex-col gap-2.5">
          <legend className="text-sm font-medium">Deliver to</legend>
          <div className="grid gap-2">
            {(
              [
                {
                  value: "all",
                  label: "All users",
                  hint: "Every account on the platform.",
                },
                {
                  value: "selected",
                  label: "Selected users",
                  hint: "One or more email addresses.",
                },
              ] as const
            ).map((option) => (
              <label
                key={option.value}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors duration-300",
                  audience === option.value
                    ? "border-brand-border bg-brand-surface"
                    : "border-hairline bg-surface-2 hover:border-hairline-strong"
                )}
              >
                <input
                  type="radio"
                  value={option.value}
                  {...form.register("audience")}
                  className="size-4 accent-[var(--brand)]"
                />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm font-medium">{option.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {option.hint}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* ------------------------------------------------------------ type */}
        <div className="flex flex-col gap-2.5">
          <Label htmlFor="admin-notification-type">Category</Label>
          <select
            id="admin-notification-type"
            {...form.register("type")}
            className="h-11 w-full rounded-lg border border-hairline bg-surface-1 px-3 text-sm text-foreground shadow-soft transition-colors duration-300 outline-none focus-visible:border-brand-border focus-visible:ring-3 focus-visible:ring-brand/20"
          >
            {NOTIFICATION_TYPES.map((type) => (
              <option key={type} value={type}>
                {typeLabels[type]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {audience === "selected" && (
        <div className="flex flex-col gap-2.5">
          <Label htmlFor="admin-notification-emails">
            Recipient emails — one per line
          </Label>
          <textarea
            id="admin-notification-emails"
            rows={4}
            placeholder={"user@example.com\nanother@example.com"}
            {...form.register("emails")}
            aria-invalid={form.formState.errors.emails ? "true" : undefined}
            className="min-h-24 w-full rounded-lg border border-hairline bg-surface-1 px-3 py-2.5 font-mono text-sm text-foreground shadow-soft transition-colors duration-300 outline-none placeholder:text-muted-foreground focus-visible:border-brand-border focus-visible:ring-3 focus-visible:ring-brand/20 aria-[invalid=true]:border-destructive"
          />
          {form.formState.errors.emails && (
            <p role="alert" className="text-xs text-destructive">
              {form.formState.errors.emails.message}
            </p>
          )}
          <p className="text-xs leading-relaxed text-subtle-foreground">
            Addresses are resolved to account ids inside the database. Only ids
            are stored on the notification — never the address list.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        <Label htmlFor="admin-notification-title">Title</Label>
        <Input
          id="admin-notification-title"
          placeholder="e.g. Scheduled maintenance tonight"
          {...form.register("title")}
          aria-invalid={form.formState.errors.title ? "true" : undefined}
        />
        {form.formState.errors.title && (
          <p role="alert" className="text-xs text-destructive">
            {form.formState.errors.title.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        <Label htmlFor="admin-notification-body">Message</Label>
        <textarea
          id="admin-notification-body"
          rows={5}
          placeholder="What should recipients know? Keep it plain and specific."
          {...form.register("body")}
          aria-invalid={form.formState.errors.body ? "true" : undefined}
          className="min-h-28 w-full rounded-lg border border-hairline bg-surface-1 px-3 py-2.5 text-sm text-foreground shadow-soft transition-colors duration-300 outline-none placeholder:text-muted-foreground focus-visible:border-brand-border focus-visible:ring-3 focus-visible:ring-brand/20 aria-[invalid=true]:border-destructive"
        />
        {form.formState.errors.body && (
          <p role="alert" className="text-xs text-destructive">
            {form.formState.errors.body.message}
          </p>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-2.5">
          <Label htmlFor="admin-notification-href">
            Destination link <span className="text-subtle-foreground">(optional)</span>
          </Label>
          <Input
            id="admin-notification-href"
            placeholder="/wallet"
            {...form.register("href")}
            aria-invalid={form.formState.errors.href ? "true" : undefined}
          />
          {form.formState.errors.href && (
            <p role="alert" className="text-xs text-destructive">
              {form.formState.errors.href.message}
            </p>
          )}
          <p className="text-xs leading-relaxed text-subtle-foreground">
            An in-app path (e.g. /investments) or an https link. Recipients get a
            “View” action when one is set.
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          <Label htmlFor="admin-notification-expiry">
            Expires after (days) <span className="text-subtle-foreground">(0 = never)</span>
          </Label>
          <Input
            id="admin-notification-expiry"
            type="number"
            min={0}
            max={365}
            inputMode="numeric"
            {...form.register("expiresInDays")}
            aria-invalid={form.formState.errors.expiresInDays ? "true" : undefined}
          />
          {form.formState.errors.expiresInDays && (
            <p role="alert" className="text-xs text-destructive">
              {form.formState.errors.expiresInDays.message}
            </p>
          )}
        </div>
      </div>

      {message && (
        <FormMessage
          state={{
            message: message.text,
            tone: message.tone === "success" ? "success" : "error",
          }}
        />
      )}

      <div className="flex flex-col gap-2 border-t border-hairline pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-subtle-foreground">
          Sending is verified against the admin allow-list inside Postgres. The
          action cannot be used by a non-admin account, however the request is
          crafted.
        </p>
        <Button
          type="submit"
          variant="accent"
          size="md"
          disabled={form.formState.isSubmitting}
          className="shrink-0"
        >
          <Send />
          {form.formState.isSubmitting ? "Sending…" : "Send notification"}
        </Button>
      </div>
    </form>
  );
}

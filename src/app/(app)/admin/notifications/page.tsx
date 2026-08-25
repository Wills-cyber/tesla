import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Megaphone, ShieldAlert } from "lucide-react";

import { AdminNotificationForm } from "@/components/admin/admin-notification-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { appRoutes, authRoutes } from "@/config/navigation";
import { getAccountMode, isPreviewMode } from "@/lib/auth/session";
import { getIsAdmin, resolveOrEmpty } from "@/lib/data";

export const metadata: Metadata = {
  title: "Send announcement",
  description: "Broadcast a platform notification.",
  robots: { index: false, follow: false },
};

/**
 * Admin notification surface.
 *
 * Not part of the five-area navigation: it is reached only from the account menu
 * of an operator who is a member of the `admins` table, and it is guarded here
 * twice more — the session is verified by `getAccountMode()` and the admin check
 * runs `is_admin` inside Postgres against `auth.uid()`.
 *
 * The form itself submits to `sendAdminNotificationAction`, whose database
 * function repeats the admin check with its own `auth.uid()`, so no craft of the
 * request (or of this page) can make a non-admin send anything.
 */
export default async function AdminNotificationsPage() {
  const account = await getAccountMode();
  if (account.mode === "anonymous") {
    redirect(authRoutes.login);
  }

  const preview = isPreviewMode(account);
  const { data: isAdmin } = resolveOrEmpty(await getIsAdmin(), false);

  const blocked = !preview && !isAdmin;

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Send an announcement"
        description="Compose one notification and deliver it to a single account, a chosen list, or every user. Delivery is recorded against each recipient's own feed — nothing here touches balances or transactions."
        badge={
          preview ? (
            <StatusPill tone="brand" dot className="self-start">
              UI Preview · No account connected
            </StatusPill>
          ) : isAdmin ? (
            <StatusPill tone="info" dot className="self-start">
              Administrator
            </StatusPill>
          ) : (
            <StatusPill tone="danger" dot className="self-start">
              Admins only
            </StatusPill>
          )
        }
      />

      {blocked ? (
        <EmptyState
          icon={ShieldAlert}
          size="lg"
          title="This area is restricted"
          description="Only accounts listed in the platform's admin allow-list can send notifications. Your account isn't one of them, so nothing here can be submitted."
          action={
            <Button asChild variant="hairline" size="md">
              <Link href={appRoutes.dashboard}>Back to dashboard</Link>
            </Button>
          }
        />
      ) : preview ? (
        <div className="flex items-start gap-3 rounded-2xl border border-brand-border bg-brand-surface p-5 text-sm leading-relaxed text-foreground">
          <Megaphone aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand" />
          <p>
            The broadcast form is ready, but no backend is connected, so sending
            is disabled. Connect Supabase, apply the migrations, and add your
            account to the <code>admins</code> table to use it.
          </p>
        </div>
      ) : (
        <div className="max-w-3xl">
          <AdminNotificationForm />
        </div>
      )}
    </>
  );
}

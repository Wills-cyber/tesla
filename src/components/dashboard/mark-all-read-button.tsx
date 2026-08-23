"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";

import { BrandedSpinner } from "@/components/brand/branded-loader";
import { Button } from "@/components/ui/button";
import { markAllNotificationsReadAction } from "@/lib/notifications/actions";

/**
 * Marks every unread notification read.
 *
 * Renders nothing when there is nothing unread, rather than showing a disabled
 * button — an action with no effect available is just noise in the header.
 *
 * The count comes from the server and the router refreshes after the action, so the
 * list re-reads rather than being patched optimistically. A notification feed that
 * disagrees with the database is worse than one that takes an extra moment.
 */
export function MarkAllReadButton({ unreadCount }: { unreadCount: number }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (unreadCount === 0) return null;

  async function markAll() {
    setPending(true);
    setError(null);

    try {
      const result = await markAllNotificationsReadAction();
      if (result.status === "success") {
        router.refresh();
        return;
      }
      setError(result.message ?? "That didn't work. Please try again.");
    } catch (caught) {
      console.error("[MarkAllReadButton] failed", caught);
      setError("We couldn't reach the server. Nothing was changed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="hairline"
        size="md"
        onClick={markAll}
        disabled={pending}
      >
        {pending ? <BrandedSpinner /> : <CheckCheck />}
        {pending ? "Marking…" : `Mark all as read (${unreadCount})`}
      </Button>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

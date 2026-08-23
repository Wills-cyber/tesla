"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

import { markNotificationReadAction } from "@/lib/notifications/actions";
import { cn } from "@/lib/utils";

/**
 * Marks one notification read.
 *
 * A plain button rather than something inside the row's link, because the row is
 * often a link to the thing the notification is about and nesting an interactive
 * control inside an anchor gives you one target that does two things depending on
 * where you tapped.
 *
 * `stopPropagation` for the same reason: pressing this must not also navigate.
 */
export function MarkReadButton({
  notificationId,
  className,
}: {
  notificationId: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function markRead(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    setPending(true);
    try {
      const result = await markNotificationReadAction({ id: notificationId });
      if (result.status === "success") router.refresh();
    } catch (caught) {
      console.error("[MarkReadButton] failed", caught);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={markRead}
      disabled={pending}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-hairline px-2 py-0.5",
        "text-[0.62rem] font-semibold tracking-[0.08em] text-muted-foreground uppercase",
        "transition-colors duration-300 hover:border-brand-border hover:text-brand-emphasis",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        "disabled:opacity-60",
        className
      )}
    >
      <Check aria-hidden="true" className="size-2.5" />
      {pending ? "Marking…" : "Mark read"}
    </button>
  );
}

import {
  BadgeCheck,
  Bell,
  CircleDollarSign,
  Landmark,
  Megaphone,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { NotificationType } from "@/types/notification";

/**
 * Category identity for a notification: one icon and one meaning-hue per event
 * kind.
 *
 * The hue follows the same semantics the rest of the product uses for money —
 * blue for deposits and system events, green for profit, orange for withdrawals,
 * indigo for investments, red for security, gold for the wallet and platform
 * promotions. Colour alone never carries the read/unread state; that always has a
 * text label or dot beside it.
 */
export type NotificationMeta = {
  icon: LucideIcon;
  /** Chip styling when the notification is unread. */
  unreadChip: string;
  /** Chip styling once it has been read — always a quiet neutral. */
  readChip: string;
};

/**
 * Read items keep their category hue on the icon glyph but drop back to a
 * neutral chip — the feed stays colourful and scannable without shouting.
 */
function readChip(toneText: string): string {
  return `border-hairline bg-surface-2 ${toneText}`;
}

export const notificationMeta: Record<NotificationType, NotificationMeta> = {
  auth: {
    icon: BadgeCheck,
    unreadChip: "border-info/25 bg-info-surface text-info",
    readChip: readChip("text-info/75"),
  },
  security: {
    icon: ShieldCheck,
    unreadChip: "border-destructive/25 bg-destructive-surface text-destructive",
    readChip: readChip("text-destructive/70"),
  },
  deposit: {
    icon: Landmark,
    unreadChip: "border-info/25 bg-info-surface text-info",
    readChip: readChip("text-info/75"),
  },
  withdrawal: {
    icon: Send,
    unreadChip: "border-warning/25 bg-warning-surface text-warning",
    readChip: readChip("text-warning/80"),
  },
  investment: {
    icon: TrendingUp,
    unreadChip: "border-invest/25 bg-invest-surface text-invest",
    readChip: readChip("text-invest/75"),
  },
  profit: {
    icon: CircleDollarSign,
    unreadChip: "border-success/25 bg-success-surface text-success",
    readChip: readChip("text-success/75"),
  },
  wallet: {
    icon: Wallet,
    unreadChip: "border-brand-border bg-brand-surface text-brand",
    readChip: readChip("text-brand/80"),
  },
  system: {
    icon: Megaphone,
    unreadChip: "border-info/25 bg-info-surface text-info",
    readChip: readChip("text-info/75"),
  },
  promotion: {
    icon: Sparkles,
    unreadChip: "border-brand-border bg-brand-surface text-brand",
    readChip: readChip("text-brand/80"),
  },
  announcement: {
    icon: Megaphone,
    unreadChip: "border-info/25 bg-info-surface text-info",
    readChip: readChip("text-info/75"),
  },
};

/** Falls back to a plain bell for an unknown event kind. */
export function getNotificationMeta(
  type: NotificationType | string | null | undefined
): NotificationMeta {
  return (
    (type ? notificationMeta[type as NotificationType] : undefined) ?? {
      icon: Bell,
      unreadChip: "border-hairline bg-surface-2 text-muted-foreground",
      readChip: readChip("text-muted-foreground"),
    }
  );
}

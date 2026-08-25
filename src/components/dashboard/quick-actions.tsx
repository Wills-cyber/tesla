import * as React from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ReceiptText,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { DepositModal } from "@/components/wallet/deposit-modal";
import { appRoutes } from "@/config/navigation";
import { cn } from "@/lib/utils";
import type { PaymentMethod } from "@/types/crypto";

/**
 * Quick actions — the four money movements, one tap each.
 *
 * Colour does the sorting: blue is money coming in, orange is money going out,
 * indigo is money at work, neutral is the record of all of it. The hues match
 * the same meanings everywhere else in the product, so an action's colour and
 * its resulting transaction's colour always agree.
 *
 * Deposit renders its dialog in place (`DepositModal` owns the trigger); the
 * other three are routes. All four tiles share one component and one focus
 * style, and all four clear comfortable touch targets at every width.
 */

type TileTone = "info" | "warning" | "invest" | "neutral";

const TONE_CHIP: Record<TileTone, string> = {
  info: "border-info/25 bg-info-surface text-info",
  warning: "border-warning/25 bg-warning-surface text-warning",
  invest: "border-invest/25 bg-invest-surface text-invest",
  neutral: "border-hairline bg-surface-2 text-foreground",
};

const TONE_HOVER: Record<TileTone, string> = {
  info: "hover:border-info/45",
  warning: "hover:border-warning/45",
  invest: "hover:border-invest/45",
  neutral: "hover:border-hairline-strong",
};

const tileBase =
  "panel panel-interactive group/qa flex w-full items-center gap-3.5 rounded-2xl p-4 text-left transition-[border-color,box-shadow,transform] duration-300 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand " +
  "active:translate-y-px sm:p-5";

function TileIcon({ icon: Icon, tone }: { icon: LucideIcon; tone: TileTone }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-xl border",
        TONE_CHIP[tone]
      )}
    >
      <Icon className="size-4.5" />
    </span>
  );
}

function TileCopy({
  label,
  detail,
}: {
  label: string;
  detail: string;
}) {
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="text-sm font-semibold">{label}</span>
      <span className="truncate text-xs text-muted-foreground">{detail}</span>
    </span>
  );
}

export function QuickActions({
  methods,
  className,
}: {
  /** Payment methods passed through to the deposit dialog. */
  methods: readonly PaymentMethod[];
  className?: string;
}) {
  return (
    <section aria-labelledby="quick-actions-heading" className={className}>
      <div className="flex flex-col gap-1.5">
        <h2 id="quick-actions-heading" className="text-lg font-semibold">
          Quick actions
        </h2>
        <p className="text-sm text-muted-foreground">
          The four places money moves — everything else lives inside them.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4">
        {/* Deposit opens its dialog in place — the address never lives on a
            separate page. */}
        <DepositModal
          methods={methods}
          trigger={
            <button type="button" className={cn(tileBase, TONE_HOVER.info)}>
              <TileIcon icon={ArrowDownToLine} tone="info" />
              <TileCopy label="Deposit" detail="Fund your wallet" />
            </button>
          }
        />

        <Link
          href={appRoutes.withdraw}
          className={cn(tileBase, TONE_HOVER.warning)}
        >
          <TileIcon icon={ArrowUpFromLine} tone="warning" />
          <TileCopy label="Withdraw" detail="Request a payout" />
        </Link>

        <Link
          href={appRoutes.invest}
          className={cn(tileBase, TONE_HOVER.invest)}
        >
          <TileIcon icon={Sparkles} tone="invest" />
          <TileCopy label="Invest" detail="Browse plans" />
        </Link>

        <Link
          href={appRoutes.walletActivity}
          className={cn(tileBase, TONE_HOVER.neutral)}
        >
          <TileIcon icon={ReceiptText} tone="neutral" />
          <TileCopy label="Transactions" detail="Account history" />
        </Link>
      </div>
    </section>
  );
}

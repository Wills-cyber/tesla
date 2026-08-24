import * as React from "react";

import { LogoLockup } from "@/components/brand/logo";
import { StatusPill } from "@/components/common/status-pill";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { spendableCents, type UserBalance } from "@/types/balance";

type WalletCardProps = {
  balance: UserBalance;
  /** Deposit / Withdraw controls, rendered by the page. */
  actions?: React.ReactNode;
  /** True when Supabase isn't connected. */
  preview?: boolean;
  className?: string;
};

/**
 * The wallet header.
 *
 * Every figure comes from the `user_balances` row, which Postgres recomputes from
 * settled transactions (see `recalculate_user_balance`). None of them is derived
 * in this component, and none is inferred from plan terms — a new account reads
 * $0.00 across the board because that is the true state, not a placeholder.
 *
 * The charcoal panel is the one place in the app that carries real visual weight:
 * the balance is the single most important number on the screen, and giving it
 * inverse contrast means it never competes with anything else.
 */
export function WalletCard({
  balance,
  actions,
  preview = false,
  className,
}: WalletCardProps) {
  const reserved = balance.pendingWithdrawalCents;
  const spendable = spendableCents(balance);

  return (
    <section
      aria-labelledby="wallet-balance-heading"
      className={cn("panel-inverse relative overflow-hidden", className)}
    >
      {/* One soft gold wash. The only decoration on this panel. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-28 -right-20 size-72 rounded-full bg-gold-500/16 blur-3xl"
      />
      <div aria-hidden="true" className="grid-field absolute inset-0 opacity-[0.06]" />

      <div className="relative flex flex-col gap-8 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          {/* The one dark surface in the product, so the one place the full logo
              artwork can be shown as drawn — chrome on black, no plate needed. */}
          <LogoLockup size="sm" className="w-32 xl:w-36" />
          {preview && (
            <StatusPill
              tone="brand"
              dot
              className="border-gold-500/40 bg-gold-500/12 text-gold-200"
            >
              No account connected
            </StatusPill>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <h2
            id="wallet-balance-heading"
            className="text-[0.7rem] font-medium tracking-[0.2em] text-surface-inverse-foreground/60 uppercase"
          >
            Available Balance
          </h2>
          <p
            data-numeric
            className="text-4xl leading-none font-semibold tracking-tight text-surface-inverse-foreground sm:text-5xl"
          >
            {formatCurrency(balance.availableCents, {
              currency: balance.currency,
            })}
          </p>
          {reserved > 0 ? (
            <p className="text-xs text-surface-inverse-foreground/65">
              <span data-numeric className="font-semibold">
                {formatCurrency(reserved, { currency: balance.currency })}
              </span>{" "}
              reserved by a pending withdrawal ·{" "}
              <span data-numeric className="font-semibold">
                {formatCurrency(spendable, { currency: balance.currency })}
              </span>{" "}
              available to request
            </p>
          ) : (
            <p className="text-xs text-surface-inverse-foreground/60">
              Derived from settled transactions only.
            </p>
          )}
        </div>

        {actions && <div className="flex flex-wrap gap-3">{actions}</div>}

        <dl className="grid gap-x-6 gap-y-5 border-t border-white/12 pt-7 sm:grid-cols-2 lg:grid-cols-4">
          <Figure
            label="Total Deposited"
            value={formatCurrency(balance.totalDepositedCents, {
              currency: balance.currency,
            })}
          />
          <Figure
            label="Total Withdrawn"
            value={formatCurrency(balance.totalWithdrawnCents, {
              currency: balance.currency,
            })}
          />
          <Figure
            label="Total Invested"
            value={formatCurrency(balance.totalInvestedCents, {
              currency: balance.currency,
            })}
          />
          <Figure
            label="Total Profit"
            value={formatCurrency(balance.totalProfitCents, {
              currency: balance.currency,
            })}
            emphasis
          />
        </dl>
      </div>
    </section>
  );
}

function Figure({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <dt className="text-[0.65rem] font-medium tracking-[0.14em] text-surface-inverse-foreground/55 uppercase">
        {label}
      </dt>
      <dd
        data-numeric
        className={cn(
          "text-lg font-semibold",
          emphasis ? "text-gold-200" : "text-surface-inverse-foreground"
        )}
      >
        {value}
      </dd>
    </div>
  );
}

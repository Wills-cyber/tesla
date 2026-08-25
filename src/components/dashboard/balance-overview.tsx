import * as React from "react";
import { Banknote, Clock3, PiggyBank } from "lucide-react";

import { StatCard } from "@/components/dashboard/stat-card";
import { RevealGroup, RevealItem } from "@/components/common/reveal";
import { formatCurrency } from "@/lib/format";
import { spendableCents, type UserBalance } from "@/types/balance";

type BalanceOverviewProps = {
  balance: UserBalance;
  className?: string;
};

/**
 * The dashboard's financial summary — the first thing the page communicates.
 *
 * Four visually distinct cards, one job each:
 *
 *   · Available Balance — dominant, on the inverse charcoal panel. The single
 *     most important number on the screen gets the strongest contrast.
 *   · Total Invested   — indigo: capital committed to plans.
 *   · Total Profit     — green: money actually credited, never projected.
 *   · Pending          — orange: reserved by withdrawal requests in flight.
 *
 * Every figure is read from the `user_balances` row, which Postgres recomputes
 * from settled transactions. Nothing here is derived from plan terms.
 */
export function BalanceOverview({ balance, className }: BalanceOverviewProps) {
  const reserved = balance.pendingWithdrawalCents;
  const spendable = spendableCents(balance);

  return (
    <section
      aria-labelledby="balance-overview-heading"
      className={className}
    >
      <h2 id="balance-overview-heading" className="sr-only">
        Account balances
      </h2>

      {/* xl gets a five-column rhythm: the dominant balance takes two, the three
          meaning-tinted figures take one each — one complete row, nothing
          dangling. sm gets two columns, so pending still never hangs alone. */}
      <RevealGroup
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
        stagger={0.07}
      >
        {/* ------------------------------------------- Available (dominant) */}
        <RevealItem className="flex sm:col-span-2 xl:col-span-2">
          <div
            aria-labelledby="available-balance-heading"
            className="panel-inverse relative flex w-full flex-col justify-between gap-6 overflow-hidden p-6 sm:p-7"
          >
            {/* One soft gold wash and a faint grid — the only decoration. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-gold-500/16 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="grid-field absolute inset-0 opacity-[0.05]"
            />

            <div className="relative flex flex-wrap items-center justify-between gap-2">
              <h3
                id="available-balance-heading"
                className="text-[0.7rem] font-medium tracking-[0.2em] text-surface-inverse-foreground/60 uppercase"
              >
                Available Balance
              </h3>
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-gold-400"
              />
            </div>

            <div className="relative flex flex-col gap-2">
              <p
                data-numeric
                className="text-[clamp(1.9rem,6.5vw,3rem)] leading-none font-semibold tracking-tight text-surface-inverse-foreground"
              >
                {formatCurrency(balance.availableCents, {
                  currency: balance.currency,
                })}
              </p>
              <p className="text-xs text-surface-inverse-foreground/65">
                {reserved > 0 ? (
                  <>
                    <span data-numeric className="font-semibold">
                      {formatCurrency(reserved, {
                        currency: balance.currency,
                      })}
                    </span>{" "}
                    reserved by a pending withdrawal ·{" "}
                    <span data-numeric className="font-semibold">
                      {formatCurrency(spendable, {
                        currency: balance.currency,
                      })}
                    </span>{" "}
                    available to request
                  </>
                ) : (
                  "Derived from settled transactions only."
                )}
              </p>
            </div>

            <dl className="relative grid grid-cols-2 gap-x-6 gap-y-4 border-t border-white/12 pt-5">
              <div className="flex flex-col gap-1">
                <dt className="text-[0.62rem] font-medium tracking-[0.14em] text-surface-inverse-foreground/55 uppercase">
                  Total Deposited
                </dt>
                <dd
                  data-numeric
                  className="text-base font-semibold text-surface-inverse-foreground"
                >
                  {formatCurrency(balance.totalDepositedCents, {
                    currency: balance.currency,
                  })}
                </dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-[0.62rem] font-medium tracking-[0.14em] text-surface-inverse-foreground/55 uppercase">
                  Total Withdrawn
                </dt>
                <dd
                  data-numeric
                  className="text-base font-semibold text-surface-inverse-foreground"
                >
                  {formatCurrency(balance.totalWithdrawnCents, {
                    currency: balance.currency,
                  })}
                </dd>
              </div>
            </dl>
          </div>
        </RevealItem>

        {/* ------------------------------------------------- Invested (indigo) */}
        <RevealItem className="flex">
          <StatCard
            label="Total Invested"
            value={formatCurrency(balance.totalInvestedCents, {
              currency: balance.currency,
            })}
            icon={PiggyBank}
            note="Capital committed to your investment plans."
            tone="invest"
          />
        </RevealItem>

        {/* ----------------------------------------------------- Profit (green) */}
        <RevealItem className="flex">
          <StatCard
            label="Total Profit"
            value={formatCurrency(balance.totalProfitCents, {
              currency: balance.currency,
            })}
            icon={Banknote}
            note="Payments actually credited — never projected."
            tone="success"
          />
        </RevealItem>

        {/* --------------------------------------------------- Pending (orange) */}
        <RevealItem className="flex sm:col-span-2 xl:col-span-1">
          <StatCard
            label="Pending Withdrawals"
            value={formatCurrency(balance.pendingWithdrawalCents, {
              currency: balance.currency,
            })}
            icon={Clock3}
            note={
              reserved > 0
                ? "Reserved until requests are settled."
                : "No withdrawal requests in flight."
            }
            tone="warning"
          />
        </RevealItem>
      </RevealGroup>
    </section>
  );
}

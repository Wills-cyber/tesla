"use client";

import * as React from "react";
import { CircleAlert, RefreshCw } from "lucide-react";

import { BrandedSpinner } from "@/components/brand/branded-loader";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/common/status-pill";
import { useEpochSeconds } from "@/hooks/use-epoch-seconds";
import { useMounted } from "@/hooks/use-mounted";
import { formatAssetAmount, formatCurrency } from "@/lib/format";
import { quoteSecondsRemaining } from "@/lib/wallet/costs";
import { cn } from "@/lib/utils";
import type { ExchangeQuote, PaymentMethod } from "@/types/crypto";

/**
 * The live conversion panel.
 *
 * It renders exactly one of four honest states and never blends them:
 *
 *   1. **quoting** — a branded loader while the server asks the rate provider.
 *   2. **quoted** — the crypto amount, the rate it came from, who quoted it, when,
 *      and how long the quote has left.
 *   3. **expired** — the quote is displayed struck through with a refresh action,
 *      because a lapsed rate is not a rate the payout rail will honour.
 *   4. **unavailable** — the provider's reason, verbatim.
 *
 * State 4 is the one that matters most today: no rate provider is connected, so
 * the panel says "Live conversion temporarily unavailable" and explains why. The
 * alternative — computing `amount / 1` because USDT is "basically a dollar" — puts
 * a number on screen that nothing has agreed to pay.
 *
 * The countdown ticks on the client and starts from a `Date.now()` read inside an
 * effect, never during render, so the server and the first client paint agree.
 */
export function WithdrawalQuotePanel({
  method,
  quote,
  quoting,
  notice,
  onRefresh,
  className,
}: {
  method: PaymentMethod;
  quote: ExchangeQuote | null;
  quoting: boolean;
  /** Why there is no quote. Shown verbatim. */
  notice: string | null;
  onRefresh?: () => void;
  className?: string;
}) {
  const secondsLeft = useQuoteCountdown(quote);
  const expired = quote !== null && secondsLeft === 0;

  return (
    <section
      aria-live="polite"
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-4",
        quote && !expired
          ? "border-brand-border bg-brand-surface"
          : "border-hairline bg-surface-2",
        className
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
          Current quote
        </span>

        {quote && !expired && secondsLeft !== null && (
          <StatusPill tone={secondsLeft <= 10 ? "warning" : "brand"}>
            Expires in {secondsLeft}s
          </StatusPill>
        )}
        {expired && <StatusPill tone="warning">Quote expired</StatusPill>}
      </header>

      {quoting ? (
        <p className="flex items-center gap-2.5 text-sm text-muted-foreground">
          <BrandedSpinner />
          Getting the current {method.asset.symbol} rate…
        </p>
      ) : quote ? (
        <>
          <p
            data-numeric
            className={cn(
              "text-2xl leading-none font-semibold tracking-tight",
              expired
                ? "text-muted-foreground line-through"
                : "text-brand-emphasis"
            )}
          >
            {formatAssetAmount(quote.assetAmount, method.asset.displayDecimals)}{" "}
            <span className="text-base font-medium">{method.asset.symbol}</span>
          </p>

          <dl className="flex flex-wrap gap-x-6 gap-y-1.5 text-[0.7rem] text-muted-foreground">
            <div className="flex gap-1.5">
              <dt>Rate</dt>
              <dd data-numeric className="font-semibold text-foreground">
                {formatRate(quote.usdPerUnit)} / {method.asset.symbol}
              </dd>
            </div>
            <div className="flex gap-1.5">
              <dt>Quoted</dt>
              <dd className="font-semibold text-foreground">
                <QuoteTimestamp value={quote.quotedAt} />
              </dd>
            </div>
            <div className="flex gap-1.5">
              <dt>Provider</dt>
              <dd className="font-semibold text-foreground">{quote.provider}</dd>
            </div>
          </dl>

          {expired && onRefresh && (
            <Button
              type="button"
              variant="hairline"
              size="sm"
              onClick={onRefresh}
              className="self-start"
            >
              <RefreshCw />
              Get a new quote
            </Button>
          )}
        </>
      ) : (
        <div className="flex gap-2.5">
          <CircleAlert
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-foreground">
              Live conversion temporarily unavailable.
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {notice ??
                "Enter an amount at or above the minimum to see the crypto equivalent."}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * Seconds until the quote lapses, ticking once a second.
 *
 * `null` until hydration, because the countdown is derived from the *user's* clock
 * and reading it during the server render is the classic hydration mismatch. The
 * tick itself is a clock subscription rather than an effect that writes state —
 * see `useEpochSeconds`.
 */
function useQuoteCountdown(quote: ExchangeQuote | null): number | null {
  const nowSeconds = useEpochSeconds();
  if (!quote || nowSeconds === null) return null;
  return quoteSecondsRemaining(quote, nowSeconds * 1000);
}

/**
 * The quote time, rendered client-side only.
 *
 * Formatting a timestamp in the user's locale on the server produces the
 * *server's* locale, so the value is withheld until hydration. `useMounted` is the
 * project's existing answer to exactly this: two `useSyncExternalStore` snapshots
 * that state plainly that the two environments differ.
 */
function QuoteTimestamp({ value }: { value: string }) {
  const mounted = useMounted();

  if (!mounted) return <span data-numeric>—</span>;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return <span data-numeric>—</span>;

  return (
    <span data-numeric>
      {date.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })}
    </span>
  );
}

/**
 * A unit price, at enough precision to be checkable.
 *
 * `formatCurrency` rounds to cents, which turns a $0.0847 token into "$0.08" and
 * makes the rate impossible to verify against an exchange. Sub-cent prices get
 * six decimals instead.
 */
function formatRate(usdPerUnit: string): string {
  const value = Number(usdPerUnit);
  if (!Number.isFinite(value)) return "—";
  if (value >= 1) return formatCurrency(Math.round(value * 100));
  return `$${value.toFixed(6).replace(/0+$/, "").replace(/\.$/, "")}`;
}

import * as React from "react";

import { BrandedSpinner } from "@/components/brand/branded-loader";
import { formatAssetAmount, formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PaymentMethod, WithdrawalCosts } from "@/types/crypto";

/**
 * The money breakdown for a withdrawal.
 *
 * The organising idea is that two different currencies are moving and conflating
 * them is how fee tables end up lying:
 *
 *   · The **USD side** is what leaves the platform balance — the amount requested
 *     plus any platform service fee. That is the "Total deducted" figure, and it
 *     is the number the balance check runs against.
 *   · The **asset side** is what happens on-chain. The network takes its fee out
 *     of the transfer itself, so it reduces what *arrives* without changing what
 *     was debited. Showing it as part of the deduction would double-count it.
 *
 * Where a figure isn't known, the row says so. A network fee depends on live chain
 * conditions and is the provider's number, not ours; with no provider connected
 * there is nothing to state, so the row reads "Calculated at withdrawal" rather
 * than carrying an invented estimate. The service fee row is only rendered when a
 * fee is actually configured — a permanent "$0.00 service fee" line is noise, and
 * inventing one would be worse.
 */
export function WithdrawalSummary({
  method,
  costs,
  quoting = false,
  /** Why no quote is available, when that is the case. */
  quoteNotice,
  className,
}: {
  method: PaymentMethod;
  costs: WithdrawalCosts;
  quoting?: boolean;
  quoteNotice?: string | null;
  className?: string;
}) {
  const { asset } = method;
  const hasQuote = costs.quote !== null;
  const decimals = asset.displayDecimals;

  const assetValue = (amount: string | null) =>
    amount === null
      ? null
      : `${formatAssetAmount(amount, decimals)} ${asset.symbol}`;

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-hairline bg-surface-1",
        className
      )}
    >
      <dl className="flex flex-col divide-y divide-hairline">
        <SummaryRow
          label="Withdrawal amount"
          value={formatCurrency(costs.amountCents)}
        />

        {/* Only when a fee genuinely exists. See the note above. */}
        {costs.serviceFeeCents > 0 && (
          <SummaryRow
            label="Service fee"
            value={formatCurrency(costs.serviceFeeCents)}
            hint="Platform fee, taken from your balance."
          />
        )}

        <SummaryRow
          label="Total deducted"
          value={formatCurrency(costs.totalDeductedCents)}
          hint="What leaves your TESLA Electronics balance."
          emphasis
        />

        <SummaryRow
          label="Network fee"
          value={
            quoting
              ? "pending"
              : (assetValue(costs.networkFeeAsset) ?? "unavailable")
          }
          pending={quoting}
          hint={
            hasQuote
              ? costs.networkFeeCents !== null
                ? `Approximately ${formatCurrency(costs.networkFeeCents)} at the quoted rate. Paid to the ${method.network.name} network out of the transfer.`
                : `Paid to the ${method.network.name} network out of the transfer.`
              : "Calculated at withdrawal — the fee depends on live network conditions and is set by the payout provider."
          }
        />

        <SummaryRow
          label={`You receive (est.)`}
          value={
            quoting
              ? "pending"
              : (assetValue(costs.netAssetAmount) ?? "unavailable")
          }
          pending={quoting}
          emphasis
          hint={
            hasQuote
              ? costs.netUsdCents !== null
                ? `About ${formatCurrency(costs.netUsdCents)} of ${asset.symbol}, after the network fee. Arrives at your destination address.`
                : `After the network fee. Arrives at your destination address.`
              : (quoteNotice ??
                "No live exchange rate is available, so the crypto amount cannot be stated.")
          }
        />
      </dl>
    </div>
  );
}

/**
 * One row of the breakdown.
 *
 * `pending` and the literal `"unavailable"` value both render as text rather than
 * a number, so a missing figure can never be mistaken for a zero — "$0.00
 * network fee" and "we don't know the network fee" are very different claims.
 */
function SummaryRow({
  label,
  value,
  hint,
  emphasis = false,
  pending = false,
}: {
  label: string;
  value: string;
  hint?: string;
  emphasis?: boolean;
  pending?: boolean;
}) {
  const unknown = pending || value === "unavailable";

  return (
    <div className="flex flex-col gap-1 px-4 py-3.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <dt className="shrink-0 text-xs font-medium tracking-[0.08em] text-muted-foreground uppercase">
        {label}
      </dt>

      <dd className="flex min-w-0 flex-col gap-1 sm:items-end sm:text-right">
        {pending ? (
          <span className="flex items-center gap-2 text-sm text-muted-foreground sm:justify-end">
            <BrandedSpinner />
            Fetching rate…
          </span>
        ) : unknown ? (
          <span className="text-sm font-medium text-muted-foreground">
            Not yet available
          </span>
        ) : (
          <span
            data-numeric
            className={cn(
              "text-sm font-semibold break-words",
              emphasis ? "text-brand-emphasis" : "text-foreground"
            )}
          >
            {value}
          </span>
        )}

        {hint && (
          <span className="text-[0.7rem] leading-relaxed text-subtle-foreground">
            {hint}
          </span>
        )}
      </dd>
    </div>
  );
}

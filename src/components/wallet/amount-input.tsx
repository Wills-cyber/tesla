"use client";

import * as React from "react";
import { TriangleAlert, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * What is wrong with the amount, if anything.
 *
 * A closed set rather than a free-form string, because two of these states get
 * their own dedicated panel with its own actions — "you don't have enough" and
 * "that's below the floor" are different problems with different fixes, and a
 * single red line under the field serves neither well.
 */
export type AmountProblem =
  | { kind: "none" }
  | { kind: "empty" }
  | { kind: "malformed" }
  | { kind: "below-minimum"; minimumCents: number }
  | { kind: "above-maximum"; maximumCents: number }
  | {
      kind: "insufficient";
      availableCents: number;
      requestedCents: number;
      totalCents: number;
    };

const AMOUNT_PATTERN = /^\d{1,9}(\.\d{1,2})?$/;

/** `"500.25"` → `50025`, or `null` if it isn't a clean two-decimal amount. */
export function parseAmountCents(value: string): number | null {
  const trimmed = value.trim();
  if (!AMOUNT_PATTERN.test(trimmed)) return null;
  const [whole, fraction = ""] = trimmed.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0").slice(0, 2));
}

/**
 * Grades the amount against every limit that applies.
 *
 * Ordering is deliberate: format, then floor, then ceiling, then balance. It
 * reports the problem the user can act on first, and a malformed amount is
 * checked before any limit because "$1,0OO" isn't below the minimum, it's not a
 * number.
 *
 * The balance check runs against the **total** including the service fee, matching
 * `request_withdrawal` in the database. Checking the bare amount would let someone
 * pass here and be refused by Postgres a second later, which reads as a bug.
 */
export function gradeAmount({
  value,
  minimumCents,
  maximumCents,
  spendableCents,
  serviceFeeCents,
}: {
  value: string;
  minimumCents: number;
  maximumCents: number | null;
  spendableCents: number;
  serviceFeeCents: number;
}): AmountProblem {
  if (!value.trim()) return { kind: "empty" };

  const cents = parseAmountCents(value);
  if (cents === null || cents <= 0) return { kind: "malformed" };

  if (cents < minimumCents) return { kind: "below-minimum", minimumCents };
  if (maximumCents !== null && cents > maximumCents) {
    return { kind: "above-maximum", maximumCents };
  }

  const totalCents = cents + serviceFeeCents;
  if (totalCents > spendableCents) {
    return {
      kind: "insufficient",
      availableCents: spendableCents,
      requestedCents: cents,
      totalCents,
    };
  }

  return { kind: "none" };
}

type AmountInputProps = {
  value: string;
  onChange: (value: string) => void;
  spendableCents: number;
  minimumCents: number;
  /** `null` means no ceiling is configured — nothing is displayed. */
  maximumCents: number | null;
  serviceFeeCents: number;
  problem: AmountProblem;
  /** Server-reported error, which takes precedence over the local grading. */
  error?: string | null;
  /** Only shown once the user has had a chance to finish typing. */
  showProblem: boolean;
  className?: string;
};

/**
 * The USD amount field.
 *
 * Entry is in dollars because that is the currency of the balance being spent;
 * the crypto equivalent is shown alongside from a server quote rather than typed.
 *
 * The keypad is `inputMode="decimal"` and the field is a text input, not
 * `type="number"` — a number input on mobile allows `e`, `+` and scroll-wheel
 * mutation, and silently drops the value when it can't parse, which is not
 * something an amount field should ever do.
 */
export function AmountInput({
  value,
  onChange,
  spendableCents,
  minimumCents,
  maximumCents,
  serviceFeeCents,
  problem,
  error,
  showProblem,
  className,
}: AmountInputProps) {
  const id = "withdrawal-amount";

  // The largest amount that still fits under the balance once the fee is added,
  // and under the ceiling if one exists. Never a number that would be refused.
  const maxRequestable = React.useMemo(() => {
    const afterFee = Math.max(0, spendableCents - serviceFeeCents);
    return maximumCents === null ? afterFee : Math.min(afterFee, maximumCents);
  }, [spendableCents, serviceFeeCents, maximumCents]);

  const canFillMax = maxRequestable >= minimumCents;
  const invalid = showProblem && (problem.kind !== "none" || Boolean(error));

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <Label htmlFor={id} className="text-sm font-medium">
          Withdrawal Amount
        </Label>

        <span className="inline-flex items-center gap-1.5 text-[0.7rem] text-muted-foreground">
          <Wallet aria-hidden="true" className="size-3.5" />
          Available{" "}
          <span data-numeric className="font-semibold text-foreground">
            {formatCurrency(spendableCents)}
          </span>
        </span>
      </div>

      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-lg font-medium text-muted-foreground"
        >
          $
        </span>

        <Input
          id={id}
          name="amountUsd"
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="done"
          placeholder={(minimumCents / 100).toFixed(2)}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={invalid ? true : undefined}
          aria-describedby={`${id}-limits`}
          className={cn(
            "h-14 pl-9 text-lg font-semibold [&]:font-mono [&]:tabular-nums",
            invalid && "border-destructive/50 focus-visible:border-destructive"
          )}
        />

        {canFillMax && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange((maxRequestable / 100).toFixed(2))}
            className="absolute inset-y-0 right-2 my-auto h-9 text-brand-emphasis"
          >
            Max
          </Button>
        )}
      </div>

      {/* The limits that actually apply. A maximum only appears if configured. */}
      <dl
        id={`${id}-limits`}
        className="flex flex-wrap gap-x-5 gap-y-1.5 text-[0.7rem] text-muted-foreground"
      >
        <div className="flex gap-1.5">
          <dt>Minimum</dt>
          <dd data-numeric className="font-semibold text-foreground">
            {formatCurrency(minimumCents)}
          </dd>
        </div>

        {maximumCents !== null && (
          <div className="flex gap-1.5">
            <dt>Maximum</dt>
            <dd data-numeric className="font-semibold text-foreground">
              {formatCurrency(maximumCents)}
            </dd>
          </div>
        )}

        {serviceFeeCents > 0 && (
          <div className="flex gap-1.5">
            <dt>Service fee</dt>
            <dd data-numeric className="font-semibold text-foreground">
              {formatCurrency(serviceFeeCents)}
            </dd>
          </div>
        )}
      </dl>

      {showProblem && <AmountProblemNotice problem={problem} error={error} />}
    </div>
  );
}

/**
 * The blocking states, each with the action that resolves it.
 *
 * "Insufficient balance" and "below minimum" are given their own panels rather
 * than a shared error line because they need different affordances: one is fixed
 * by lowering the amount or returning to the wallet, the other by raising it to
 * the floor. Both prevent submission, and both are re-checked server-side —
 * these panels are the courtesy, not the control.
 */
function AmountProblemNotice({
  problem,
  error,
}: {
  problem: AmountProblem;
  error?: string | null;
}) {
  if (error) {
    return (
      <Notice tone="error" title="Check the amount">
        {error}
      </Notice>
    );
  }

  switch (problem.kind) {
    case "none":
    case "empty":
      return null;

    case "malformed":
      return (
        <Notice tone="error" title="Enter a valid amount">
          Use digits and up to two decimal places — for example{" "}
          <span data-numeric>500</span> or <span data-numeric>500.00</span>.
        </Notice>
      );

    case "below-minimum":
      return (
        <Notice
          tone="error"
          title={`Minimum Withdrawal: ${formatCurrency(problem.minimumCents)}`}
        >
          You must withdraw at least{" "}
          {formatCurrency(problem.minimumCents)} USD equivalent. This minimum is
          enforced by the server, not just by this form.
        </Notice>
      );

    case "above-maximum":
      return (
        <Notice
          tone="error"
          title={`Maximum Withdrawal: ${formatCurrency(problem.maximumCents)}`}
        >
          Split this into more than one withdrawal, or lower the amount to{" "}
          {formatCurrency(problem.maximumCents)} or less.
        </Notice>
      );

    case "insufficient":
      return (
        <Notice tone="error" title="Insufficient Balance">
          <dl className="mt-1 flex flex-col gap-1">
            <div className="flex justify-between gap-4">
              <dt>Available</dt>
              <dd data-numeric className="font-semibold text-foreground">
                {formatCurrency(problem.availableCents)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Requested</dt>
              <dd data-numeric className="font-semibold text-foreground">
                {formatCurrency(problem.requestedCents)}
              </dd>
            </div>
            {problem.totalCents !== problem.requestedCents && (
              <div className="flex justify-between gap-4">
                <dt>Required, with fees</dt>
                <dd data-numeric className="font-semibold text-foreground">
                  {formatCurrency(problem.totalCents)}
                </dd>
              </div>
            )}
          </dl>
          <p className="mt-2">
            Funds reserved by a withdrawal that is already pending can&apos;t be
            requested twice.
          </p>
        </Notice>
      );
  }
}

function Notice({
  title,
  children,
  tone,
}: {
  title: string;
  children: React.ReactNode;
  tone: "error" | "warning";
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex gap-3 rounded-xl border p-4",
        tone === "error"
          ? "border-destructive/30 bg-destructive-surface"
          : "border-warning/30 bg-warning-surface"
      )}
    >
      <TriangleAlert
        aria-hidden="true"
        className={cn(
          "mt-0.5 size-4.5 shrink-0",
          tone === "error" ? "text-destructive" : "text-warning"
        )}
      />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <div className="text-xs leading-relaxed text-muted-foreground">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * The dedicated "you can't withdraw at all" screen.
 *
 * Shown instead of the amount step when the spendable balance can't cover the
 * minimum, because there is no amount the user could type that would work and a
 * field they cannot use is worse than no field.
 */
export function InsufficientBalancePanel({
  spendableCents,
  minimumCents,
  onReturn,
  className,
}: {
  spendableCents: number;
  minimumCents: number;
  onReturn: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-5 rounded-2xl border border-hairline bg-surface-1 p-6 text-center",
        className
      )}
    >
      <span
        aria-hidden="true"
        className="mx-auto grid size-12 place-items-center rounded-2xl border border-hairline bg-surface-2 text-muted-foreground"
      >
        <Wallet className="size-5" />
      </span>

      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg font-semibold">Insufficient Balance</h2>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
          The minimum withdrawal is {formatCurrency(minimumCents)}, and your
          available balance is below that.
        </p>
      </div>

      <dl className="mx-auto flex w-full max-w-xs flex-col divide-y divide-hairline overflow-hidden rounded-xl border border-hairline text-left">
        <div className="flex items-baseline justify-between gap-4 px-4 py-3">
          <dt className="text-xs tracking-[0.08em] text-muted-foreground uppercase">
            Available
          </dt>
          <dd data-numeric className="text-sm font-semibold">
            {formatCurrency(spendableCents)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 px-4 py-3">
          <dt className="text-xs tracking-[0.08em] text-muted-foreground uppercase">
            Minimum
          </dt>
          <dd data-numeric className="text-sm font-semibold text-brand-emphasis">
            {formatCurrency(minimumCents)}
          </dd>
        </div>
      </dl>

      <div className="flex justify-center">{onReturn}</div>
    </div>
  );
}

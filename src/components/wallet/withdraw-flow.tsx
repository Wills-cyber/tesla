"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  CircleAlert,
  Info,
  RotateCcw,
  ShieldCheck,
  Wallet,
} from "lucide-react";

import { BrandedSpinner } from "@/components/brand/branded-loader";
import {
  AmountInput,
  InsufficientBalancePanel,
  gradeAmount,
  parseAmountCents,
  type AmountProblem,
} from "@/components/wallet/amount-input";
import { AddressInput, checkAddress } from "@/components/wallet/address-input";
import { CryptoAssetSelector } from "@/components/wallet/crypto-asset-selector";
import {
  NetworkSelector,
  NetworkWarning,
} from "@/components/wallet/network-selector";
import {
  SaveAddressToggle,
  SavedAddressPicker,
} from "@/components/wallet/saved-address-picker";
import { WithdrawalConfirmation } from "@/components/wallet/withdrawal-confirmation";
import { WithdrawalQuotePanel } from "@/components/wallet/withdrawal-quote-panel";
import {
  WithdrawalSteps,
  type FlowStep,
} from "@/components/wallet/withdrawal-steps";
import { WithdrawalSummary } from "@/components/wallet/withdrawal-summary";
import { Button } from "@/components/ui/button";
import { appRoutes } from "@/config/navigation";
import { computeWithdrawalCosts, isQuoteExpired } from "@/lib/wallet/costs";
import { applyBasisPoints } from "@/lib/crypto/decimal";
import { quoteWithdrawalAction, submitWithdrawalAction } from "@/lib/wallet/actions";
import { cn } from "@/lib/utils";
import type {
  ExchangeQuote,
  PaymentMethod,
  SavedAddress,
  WithdrawalPolicy,
} from "@/types/crypto";

/* --------------------------------------------------------------------- Steps */

const STEPS: readonly FlowStep[] = [
  { id: "asset", label: "Asset", shortLabel: "Asset" },
  { id: "network", label: "Network", shortLabel: "Net" },
  { id: "address", label: "Address", shortLabel: "Addr" },
  { id: "amount", label: "Amount", shortLabel: "Amt" },
  { id: "review", label: "Review", shortLabel: "Review" },
] as const;

const ASSET = 0;
const NETWORK = 1;
const ADDRESS = 2;
const AMOUNT = 3;
const REVIEW = 4;

/* --------------------------------------------------------------------- State */

/**
 * A quote, tagged with the exact request it answers.
 *
 * `key` is `${methodId}:${amountCents}`. Storing it alongside the result means a
 * stale reply is *structurally* unusable rather than merely unlikely to be shown:
 * a quote for a different pair or a different amount simply does not match the
 * current key, so a slow response from an earlier keystroke can never be
 * displayed against a newer input.
 */
type QuoteState = {
  key: string;
  quote: ExchangeQuote | null;
  reason: string | null;
};

/** What the server said, when it said no. */
type Outcome = {
  tone: "error" | "notice";
  title: string;
  message: string;
};

type WithdrawFlowProps = {
  methods: readonly PaymentMethod[];
  savedAddresses: readonly SavedAddress[];
  policy: WithdrawalPolicy;
  /** Available minus already-reserved, in cents. Derived server-side. */
  spendableCents: number;
  /** True when Supabase isn't connected, so nothing here is account-backed. */
  preview: boolean;
};

/**
 * The withdrawal flow.
 *
 * ---------------------------------------------------------------------------
 * Why five steps
 * ---------------------------------------------------------------------------
 * Asset, network, address, amount, review. One decision per screen, because the
 * two mistakes that destroy crypto — wrong network, wrong address — are both
 * mistakes of inattention, and a single long form is where inattention lives. The
 * network step is separate from the asset step for a specific reason: an asset does
 * not exist on every chain, so "USDT" is not yet a destination, and making the
 * chain its own deliberate choice is what stops it being skimmed.
 *
 * ---------------------------------------------------------------------------
 * What this component is NOT
 * ---------------------------------------------------------------------------
 * It is not a security boundary. Every check here is a courtesy that saves a
 * round trip: catching a Tron address typed for an Ethereum payout before the user
 * waits on the server. The real boundary is `submitWithdrawalAction`, which
 * re-derives the pair, the policy, the fee and the balance server-side, and then
 * `request_withdrawal()` in Postgres, which re-validates all of it again against
 * rows the browser cannot touch.
 *
 * It also never computes a crypto amount. The conversion comes from a server-side
 * rate provider; with none connected the quote is reported unavailable and the
 * flow says so rather than showing a number the payout rail would not honour.
 * Nothing here signs, broadcasts, or holds a key.
 */
export function WithdrawFlow({
  methods,
  savedAddresses,
  policy,
  spendableCents,
  preview,
}: WithdrawFlowProps) {
  const router = useRouter();

  /* ------------------------------------------------------------- form state */
  const [stepIndex, setStepIndex] = React.useState(ASSET);
  const [assetSymbol, setAssetSymbol] = React.useState<string | null>(null);
  const [methodId, setMethodId] = React.useState<string | null>(null);
  const [destinationAddress, setDestinationAddress] = React.useState("");
  const [amountUsd, setAmountUsd] = React.useState("");
  const [confirmed, setConfirmed] = React.useState(false);
  const [saveAddress, setSaveAddress] = React.useState(false);
  const [addressLabel, setAddressLabel] = React.useState("");

  const [quoteState, setQuoteState] = React.useState<QuoteState | null>(null);
  const [quoteNonce, setQuoteNonce] = React.useState(0);

  const [submitting, setSubmitting] = React.useState(false);
  const [outcome, setOutcome] = React.useState<Outcome | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [amountTouched, setAmountTouched] = React.useState(false);

  /* -------------------------------------------------------------- derived */

  const networksForAsset = React.useMemo(
    () => methods.filter((method) => method.asset.symbol === assetSymbol),
    [methods, assetSymbol]
  );

  const selected = React.useMemo(
    () => methods.find((method) => method.id === methodId) ?? null,
    [methods, methodId]
  );

  const amountCents = parseAmountCents(amountUsd);

  const effectiveMinimum = Math.max(
    policy.minimumCents,
    selected?.minWithdrawalCents ?? 0
  );

  // The fee the *server* will apply, derived from the same basis-point policy by
  // the same helper. A separate client formula here is how a confirmation screen
  // ends up a cent away from the charge.
  const serviceFeeCents = applyBasisPoints(
    amountCents ?? 0,
    policy.serviceFeeBps
  );

  const amountProblem: AmountProblem = React.useMemo(
    () =>
      gradeAmount({
        value: amountUsd,
        minimumCents: effectiveMinimum,
        maximumCents: policy.maximumCents,
        spendableCents,
        serviceFeeCents,
      }),
    [
      amountUsd,
      effectiveMinimum,
      policy.maximumCents,
      spendableCents,
      serviceFeeCents,
    ]
  );

  const addressValidity = checkAddress(selected, destinationAddress);

  /**
   * The request a quote would be for, or `null` when there is nothing to quote.
   *
   * `quoteNonce` participates so an explicit "get a new quote" re-runs the effect
   * even though the pair and amount are unchanged.
   */
  const quoteKey =
    selected && amountCents !== null && amountProblem.kind === "none"
      ? `${selected.id}:${amountCents}:${quoteNonce}`
      : null;

  const activeQuote = quoteState?.key === quoteKey ? quoteState : null;
  const quote = activeQuote?.quote ?? null;
  const quoteNotice = activeQuote?.reason ?? null;
  // Covers the debounce window and the request itself, derived rather than stored.
  const quoting = quoteKey !== null && activeQuote === null;

  const costs = React.useMemo(
    () =>
      computeWithdrawalCosts({
        amountCents: amountCents ?? 0,
        serviceFeeBps: policy.serviceFeeBps,
        quote,
      }),
    [amountCents, policy.serviceFeeBps, quote]
  );

  /* ---------------------------------------------------------------- effects */

  /**
   * Fetch the quote once the pair and amount settle.
   *
   * Debounced, and every `setState` happens inside the async callback. The guard
   * simply declines to start rather than resetting anything synchronously —
   * `quote`, `quoting` and `quoteNotice` are all derived from `quoteKey` above and
   * are already correct the instant the key changes.
   */
  React.useEffect(() => {
    if (!quoteKey || !selected) return;

    let current = true;
    const amount = amountUsd.trim();
    const methodForQuote = selected.id;

    const timer = window.setTimeout(async () => {
      try {
        const result = await quoteWithdrawalAction(methodForQuote, amount);
        if (!current) return;

        setQuoteState(
          result.status === "ready"
            ? { key: quoteKey, quote: result.quote, reason: null }
            : { key: quoteKey, quote: null, reason: result.reason }
        );
      } catch (caught) {
        if (!current) return;
        console.error("[WithdrawFlow] quote failed", caught);
        setQuoteState({
          key: quoteKey,
          quote: null,
          reason:
            "We couldn't reach the rate service. Your balance is unchanged — " +
            "try again shortly.",
        });
      }
    }, 400);

    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [quoteKey, selected, amountUsd]);

  /* ------------------------------------------------------------- navigation */

  /**
   * Can the flow advance from this step?
   *
   * Each step gates on the thing it exists to collect. The review step gates on
   * the confirmation checkbox, which the server also requires — see
   * `withdrawalRequestSchema`.
   */
  function canAdvance(index: number): boolean {
    switch (index) {
      case ASSET:
        return networksForAsset.length > 0;
      case NETWORK:
        return selected !== null;
      case ADDRESS:
        return addressValidity === "valid";
      case AMOUNT:
        return amountProblem.kind === "none";
      case REVIEW:
        return confirmed && !submitting;
      default:
        return false;
    }
  }

  function goTo(index: number) {
    setOutcome(null);
    setStepIndex(Math.min(Math.max(index, ASSET), REVIEW));
    // A step change is a new screen on a phone; land at the top of it.
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function advance() {
    if (stepIndex === AMOUNT) setAmountTouched(true);
    if (!canAdvance(stepIndex)) return;
    goTo(stepIndex + 1);
  }

  /** Choosing an asset invalidates the network, and the network the address. */
  function chooseAsset(symbol: string) {
    setAssetSymbol(symbol);
    setMethodId(null);
    setFieldErrors({});
    goTo(NETWORK);
  }

  function chooseNetwork(id: string) {
    setMethodId(id);
    // A saved address for the previous pair is not valid for this one, and an
    // address is never carried across a network change — that is precisely the
    // mistake this flow exists to prevent.
    setDestinationAddress("");
    setSaveAddress(false);
    setAddressLabel("");
    setConfirmed(false);
    setFieldErrors({});
  }

  /* ---------------------------------------------------------------- submit */

  async function submit() {
    if (!selected || amountCents === null || !confirmed) return;

    setSubmitting(true);
    setOutcome(null);
    setFieldErrors({});

    try {
      const result = await submitWithdrawalAction({
        methodId: selected.id,
        amountUsd: amountUsd.trim(),
        destinationAddress: destinationAddress.trim(),
        addressConfirmed: confirmed,
        saveAddress,
        addressLabel: saveAddress ? addressLabel.trim() : undefined,
      });

      if (result.status === "success") {
        // The status page is the success screen. Navigating there means the
        // outcome is read from the row that was actually written, not from
        // anything this component believes happened.
        router.push(result.redirectTo ?? appRoutes.wallet);
        return;
      }

      if (result.status === "unavailable") {
        setOutcome({
          tone: "notice",
          title: "Withdrawal not submitted",
          message: result.message,
        });
        return;
      }

      setOutcome({
        tone: "error",
        title: "Withdrawal Failed",
        message: result.message,
      });

      // Send the user back to the field the server objected to, so "try again"
      // means "fix the thing" rather than "press it harder".
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
        if (result.fieldErrors.methodId) goTo(NETWORK);
        else if (result.fieldErrors.destinationAddress) goTo(ADDRESS);
        else if (result.fieldErrors.amountUsd) {
          setAmountTouched(true);
          goTo(AMOUNT);
        } else if (result.fieldErrors.addressLabel) goTo(ADDRESS);
      }
    } catch (caught) {
      console.error("[WithdrawFlow] submit failed", caught);
      setOutcome({
        tone: "error",
        title: "Withdrawal Failed",
        message:
          "We couldn't reach the server, so nothing was submitted and your " +
          "balance is unchanged. Check your connection and try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  /* ------------------------------------------------------------ empty states */

  if (methods.length === 0) {
    return (
      <NoticePanel
        icon={Info}
        title="No withdrawal networks are configured"
        description="The supported asset and network combinations come from the payout provider, which isn't connected yet. Nothing can be withdrawn until one is."
      />
    );
  }

  // No amount would pass, so the amount field would be a control the user cannot
  // use. Say so up front instead.
  if (spendableCents < policy.minimumCents) {
    return (
      <InsufficientBalancePanel
        spendableCents={spendableCents}
        minimumCents={policy.minimumCents}
        onReturn={
          <Button asChild variant="hairline" size="md">
            <Link href={appRoutes.wallet}>
              <ArrowLeft />
              Return to Wallet
            </Link>
          </Button>
        }
      />
    );
  }

  /* ------------------------------------------------------------------ render */

  const quoteExpired = quote !== null && isQuoteExpired(quote);
  const reviewBlocked = stepIndex === REVIEW && (!confirmed || quoteExpired);

  return (
    <div className="flex flex-col gap-6">
      {!policy.withdrawalsEnabled && (
        <NoticeBanner
          title="Withdrawals are not enabled yet"
          message={
            preview
              ? "No account or payout provider is connected, so this flow is a UI preview. Nothing you enter here is stored and no funds can move."
              : "No payout provider is connected. You can review the flow, but a request submitted now will be refused by the server and your balance will not change."
          }
        />
      )}

      <WithdrawalSteps
        steps={STEPS}
        currentIndex={stepIndex}
        onStepSelect={goTo}
      />

      {/* The steps. Height is content-driven, so the sticky footer never jumps. */}
      <div className="relative">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={STEPS[stepIndex].id}
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -14 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col gap-6"
          >
            {stepIndex === ASSET && (
              <StepShell
                title="Select Asset"
                description="Choose what you want to withdraw. Only assets the payout provider can settle are listed."
              >
                <CryptoAssetSelector
                  methods={methods}
                  value={assetSymbol}
                  onChange={chooseAsset}
                  label="Asset"
                />
              </StepShell>
            )}

            {stepIndex === NETWORK && (
              <StepShell
                title="Select Network"
                description={
                  assetSymbol
                    ? `Networks that carry ${assetSymbol}. An asset does not exist on every chain, so only real, supported pairs appear.`
                    : "Choose an asset first."
                }
              >
                <NetworkSelector
                  methods={networksForAsset}
                  value={methodId}
                  onChange={chooseNetwork}
                  operation="withdrawal"
                  label="Network"
                />

                {fieldErrors.methodId && (
                  <p role="alert" className="text-xs text-destructive">
                    {fieldErrors.methodId}
                  </p>
                )}

                {selected && <NetworkWarning method={selected} />}
              </StepShell>
            )}

            {stepIndex === ADDRESS && selected && (
              <StepShell
                title="Wallet Address"
                description={`Where the ${selected.asset.symbol} should arrive. It must be a ${selected.network.name} (${selected.network.protocol}) address.`}
              >
                <NetworkWarning method={selected} />

                <SavedAddressPicker
                  method={selected}
                  addresses={savedAddresses}
                  selectedAddress={destinationAddress}
                  onSelect={setDestinationAddress}
                />

                <AddressInput
                  method={selected}
                  value={destinationAddress}
                  onChange={(next) => {
                    setDestinationAddress(next);
                    setConfirmed(false);
                    setFieldErrors((previous) => ({
                      ...previous,
                      destinationAddress: "",
                    }));
                  }}
                  error={fieldErrors.destinationAddress || null}
                />

                <SaveAddressToggle
                  enabled={saveAddress}
                  onEnabledChange={setSaveAddress}
                  label={addressLabel}
                  onLabelChange={setAddressLabel}
                  error={fieldErrors.addressLabel || null}
                  disabled={addressValidity !== "valid"}
                />
              </StepShell>
            )}

            {stepIndex === AMOUNT && selected && (
              <StepShell
                title="Withdrawal Amount"
                description="Enter the amount in USD. The crypto equivalent is quoted live by the rate provider."
              >
                <AmountInput
                  value={amountUsd}
                  onChange={(next) => {
                    setAmountUsd(next);
                    setConfirmed(false);
                    setFieldErrors((previous) => ({ ...previous, amountUsd: "" }));
                  }}
                  spendableCents={spendableCents}
                  minimumCents={effectiveMinimum}
                  maximumCents={policy.maximumCents}
                  serviceFeeCents={serviceFeeCents}
                  problem={amountProblem}
                  error={fieldErrors.amountUsd || null}
                  showProblem={amountTouched && amountUsd.trim().length > 0}
                />

                <WithdrawalQuotePanel
                  method={selected}
                  quote={quote}
                  quoting={quoting}
                  notice={quoteNotice}
                  onRefresh={() => setQuoteNonce((value) => value + 1)}
                />

                {amountCents !== null && amountProblem.kind === "none" && (
                  <WithdrawalSummary
                    method={selected}
                    costs={costs}
                    quoting={quoting}
                    quoteNotice={quoteNotice}
                  />
                )}
              </StepShell>
            )}

            {stepIndex === REVIEW && selected && amountCents !== null && (
              <>
                <WithdrawalConfirmation
                  method={selected}
                  destinationAddress={destinationAddress.trim()}
                  costs={costs}
                  minimumCents={effectiveMinimum}
                  confirmed={confirmed}
                  onConfirmedChange={setConfirmed}
                  quoteNotice={quoteNotice}
                />

                {quoteExpired && (
                  <NoticeBanner
                    tone="warning"
                    title="That quote expired"
                    message="Get a fresh quote before confirming — the rate a lapsed quote carries is not one the payout provider will honour."
                    action={
                      <Button
                        type="button"
                        variant="hairline"
                        size="sm"
                        onClick={() => {
                          setQuoteNonce((value) => value + 1);
                          goTo(AMOUNT);
                        }}
                      >
                        <RotateCcw />
                        Refresh quote
                      </Button>
                    }
                  />
                )}
              </>
            )}

            {/* The failure state, §14. Explains what happened and offers a retry. */}
            {outcome && (
              <OutcomePanel
                outcome={outcome}
                onRetry={() => setOutcome(null)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* --------------------------------------------------- Sticky actions */}
      <div className="sticky-actions -mx-1 px-1 pt-2">
        <div className="glass flex flex-col gap-2.5 rounded-2xl border border-hairline p-3 shadow-float supports-[not(backdrop-filter:blur(0px))]:bg-surface-1 sm:flex-row sm:items-center">
          {stepIndex > ASSET && (
            <Button
              type="button"
              variant="hairline"
              size="md"
              onClick={() => goTo(stepIndex - 1)}
              disabled={submitting}
              className="sm:w-auto"
            >
              <ArrowLeft />
              Back
            </Button>
          )}

          {stepIndex < REVIEW ? (
            <Button
              type="button"
              variant="accent"
              size="md"
              onClick={advance}
              disabled={!canAdvance(stepIndex)}
              className="w-full sm:flex-1"
            >
              Continue
              <ArrowRight />
            </Button>
          ) : (
            <Button
              type="button"
              variant="accent"
              size="md"
              onClick={submit}
              disabled={reviewBlocked || submitting}
              className="w-full sm:flex-1"
            >
              {submitting ? <BrandedSpinner /> : <ShieldCheck />}
              {submitting ? "Submitting…" : "Confirm Withdrawal"}
            </Button>
          )}
        </div>

        {stepIndex === REVIEW && !confirmed && (
          <p className="px-3 pt-2 text-center text-[0.7rem] text-muted-foreground">
            Tick the confirmation above to enable this button.
          </p>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Fragments */

function StepShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-1.5">
        <h2 className="text-lg font-semibold tracking-[-0.015em]">{title}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
          {description}
        </p>
      </header>
      {children}
    </section>
  );
}

/**
 * The result of a refused submission.
 *
 * The server's reason is rendered verbatim. It is written to be safe to show — no
 * schema names, no Postgres error text, no provider internals — and paraphrasing
 * it here would only put a second, vaguer explanation in front of the user.
 */
function OutcomePanel({
  outcome,
  onRetry,
}: {
  outcome: Outcome;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col gap-4 rounded-2xl border p-5",
        outcome.tone === "error"
          ? "border-destructive/30 bg-destructive-surface"
          : "border-brand-border bg-brand-surface"
      )}
    >
      <div className="flex gap-3">
        <CircleAlert
          aria-hidden="true"
          className={cn(
            "mt-0.5 size-5 shrink-0",
            outcome.tone === "error" ? "text-destructive" : "text-brand"
          )}
        />
        <div className="flex flex-col gap-1.5">
          <p className="text-base font-semibold text-foreground">
            {outcome.title}
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {outcome.message}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2.5 pl-8">
        <Button type="button" variant="hairline" size="md" onClick={onRetry}>
          <RotateCcw />
          Try Again
        </Button>
        <Button asChild variant="ghost" size="md">
          <Link href={appRoutes.wallet}>
            <Wallet />
            Return to Wallet
          </Link>
        </Button>
      </div>
    </div>
  );
}

function NoticeBanner({
  title,
  message,
  action,
  tone = "notice",
}: {
  title: string;
  message: string;
  action?: React.ReactNode;
  tone?: "notice" | "warning";
}) {
  return (
    <div
      role="note"
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between",
        tone === "warning"
          ? "border-warning/35 bg-warning-surface"
          : "border-brand-border bg-brand-surface"
      )}
    >
      <div className="flex gap-3">
        <Info
          aria-hidden="true"
          className={cn(
            "mt-0.5 size-4.5 shrink-0",
            tone === "warning" ? "text-warning" : "text-brand"
          )}
        />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {message}
          </p>
        </div>
      </div>
      {action && <div className="shrink-0 sm:pl-4">{action}</div>}
    </div>
  );
}

function NoticePanel({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Info;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-5 rounded-2xl border border-hairline bg-surface-1 p-8 text-center">
      <span
        aria-hidden="true"
        className="grid size-12 place-items-center rounded-2xl border border-hairline bg-surface-2 text-muted-foreground"
      >
        <Icon className="size-5" />
      </span>

      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>

      <Button asChild variant="hairline" size="md">
        <Link href={appRoutes.wallet}>
          <ArrowLeft />
          Return to Wallet
        </Link>
      </Button>
    </div>
  );
}

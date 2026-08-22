"use client";

import * as React from "react";
import { ArrowUpFromLine, Info } from "lucide-react";

import { BrandedSpinner } from "@/components/brand/branded-loader";
import { CryptoAssetSelector } from "@/components/wallet/crypto-asset-selector";
import {
  NetworkSelector,
  NetworkWarning,
} from "@/components/wallet/network-selector";
import { WithdrawalConfirmation } from "@/components/wallet/withdrawal-confirmation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addressHints, isValidAddressForMethod } from "@/config/crypto";
import { formatAssetAmount, formatCurrency } from "@/lib/format";
import { usdStringToCents } from "@/lib/validations/wallet";
import { quoteWithdrawalAction, submitWithdrawalAction } from "@/lib/wallet/actions";
import { cn } from "@/lib/utils";
import type { ExchangeQuote, PaymentMethod } from "@/types/crypto";

type WithdrawModalProps = {
  methods: readonly PaymentMethod[];
  /** Available minus already-reserved, in cents. */
  spendableCents: number;
  minimumCents: number;
  trigger?: React.ReactNode;
};

type Step = "form" | "confirm";

/**
 * Crypto withdrawal flow.
 *
 * Two steps by design: enter the details, then review them on a dedicated
 * confirmation screen. The review step is not skippable, and the confirmation
 * checkbox on it is required by the server schema as well as by this form.
 *
 * Client-side validation here is a courtesy — it catches the wrong-network paste
 * early and keeps the user from waiting on a round trip to learn they typed a Tron
 * address for an Ethereum payout. The boundary is `submitWithdrawalAction`, which
 * re-derives the method, the policy and the balance server-side, and then
 * `request_withdrawal()` in Postgres, which re-validates all of it again.
 *
 * The crypto amount is never computed here. It comes from a server-side rate
 * provider; with none connected the quote is reported unavailable and the flow
 * stops rather than showing a number the payout rail wouldn't honour.
 */
export function WithdrawModal({
  methods,
  spendableCents,
  minimumCents,
  trigger,
}: WithdrawModalProps) {
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<Step>("form");

  const [assetSymbol, setAssetSymbol] = React.useState<string | null>(
    methods[0]?.asset.symbol ?? null
  );
  const [methodId, setMethodId] = React.useState<string | null>(null);
  const [amountUsd, setAmountUsd] = React.useState("");
  const [destinationAddress, setDestinationAddress] = React.useState("");
  const [confirmed, setConfirmed] = React.useState(false);

  const [quote, setQuote] = React.useState<ExchangeQuote | null>(null);
  const [quoteNotice, setQuoteNotice] = React.useState<string | null>(null);
  const [quoting, setQuoting] = React.useState(false);

  const [submitting, setSubmitting] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [messageTone, setMessageTone] =
    React.useState<"error" | "notice" | "success">("error");
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const networksForAsset = React.useMemo(
    () => methods.filter((method) => method.asset.symbol === assetSymbol),
    [methods, assetSymbol]
  );

  const selected = methodId
    ? (networksForAsset.find((method) => method.id === methodId) ?? null)
    : null;

  const amountCents = /^\d{1,9}(\.\d{1,2})?$/.test(amountUsd.trim())
    ? usdStringToCents(amountUsd)
    : null;

  const effectiveMinimum = Math.max(
    minimumCents,
    selected?.minWithdrawalCents ?? 0
  );

  /**
   * Quote the amount whenever the pair or amount settles.
   *
   * Debounced, and every response is checked against a token so a slow earlier
   * request can't overwrite a newer quote.
   */
  React.useEffect(() => {
    if (!selected || amountCents === null || amountCents < effectiveMinimum) {
      setQuote(null);
      setQuoteNotice(null);
      return;
    }

    let current = true;
    setQuoting(true);

    const timer = window.setTimeout(async () => {
      try {
        const result = await quoteWithdrawalAction(selected.id, amountUsd.trim());
        if (!current) return;

        if (result.status === "ready") {
          setQuote(result.quote);
          setQuoteNotice(null);
        } else {
          setQuote(null);
          setQuoteNotice(result.reason);
        }
      } catch (error) {
        if (!current) return;
        console.error("[WithdrawModal] quote failed", error);
        setQuote(null);
        setQuoteNotice("We couldn't reach the rate service. Try again shortly.");
      } finally {
        if (current) setQuoting(false);
      }
    }, 400);

    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [selected, amountCents, amountUsd, effectiveMinimum]);

  function reset() {
    setStep("form");
    setConfirmed(false);
    setMessage(null);
    setFieldErrors({});
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {};

    if (!selected) {
      errors.methodId = "Choose the asset and network to withdraw to.";
    }

    if (amountCents === null) {
      errors.amountUsd = "Enter an amount like 500 or 500.00";
    } else if (amountCents < effectiveMinimum) {
      errors.amountUsd = `The minimum withdrawal is ${formatCurrency(effectiveMinimum)}.`;
    } else if (amountCents > spendableCents) {
      errors.amountUsd = `You have ${formatCurrency(spendableCents)} available to withdraw.`;
    }

    const address = destinationAddress.trim();
    if (!address) {
      errors.destinationAddress = "Enter your destination wallet address.";
    } else if (selected && !isValidAddressForMethod(selected, address)) {
      errors.destinationAddress = `That isn't a valid ${selected.network.name} address. ${addressHints[selected.network.addressFormat]}`;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function review() {
    setMessage(null);
    if (validateForm()) setStep("confirm");
  }

  async function submit() {
    if (!selected || amountCents === null) return;

    setSubmitting(true);
    setMessage(null);

    try {
      const result = await submitWithdrawalAction({
        methodId: selected.id,
        amountUsd: amountUsd.trim(),
        destinationAddress: destinationAddress.trim(),
        addressConfirmed: confirmed,
      });

      if (result.status === "success") {
        setMessageTone("success");
        setMessage(result.message ?? "Withdrawal request submitted.");
        return;
      }

      if (result.status === "unavailable") {
        setMessageTone("notice");
        setMessage(result.message);
        return;
      }

      setMessageTone("error");
      setMessage(result.message);
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
        setStep("form");
      }
    } catch (error) {
      console.error("[WithdrawModal] submit failed", error);
      setMessageTone("error");
      setMessage(
        "We couldn't reach the server, so nothing was submitted. Your balance is unchanged."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="hairline" size="md">
            <ArrowUpFromLine />
            Withdraw
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[88vh] gap-0 overflow-y-auto p-0 shadow-float sm:max-w-lg">
        <DialogHeader className="border-b border-hairline p-6 text-left">
          <DialogTitle className="text-xl font-semibold">
            {step === "form" ? "Withdraw" : "Review your withdrawal"}
          </DialogTitle>
          <DialogDescription>
            {step === "form"
              ? `Send funds to your own wallet. Minimum ${formatCurrency(minimumCents)}.`
              : "Check every detail. Crypto transfers cannot be reversed."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 p-6">
          {methods.length === 0 ? (
            <div className="flex gap-3 rounded-xl border border-hairline bg-surface-2 p-4">
              <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                No withdrawal networks are configured. The supported asset and
                network combinations come from the payout provider, which
                isn&apos;t connected yet.
              </p>
            </div>
          ) : step === "form" ? (
            <>
              <CryptoAssetSelector
                methods={methods}
                value={assetSymbol}
                onChange={(symbol) => {
                  setAssetSymbol(symbol);
                  setMethodId(null);
                }}
              />

              <NetworkSelector
                methods={networksForAsset}
                value={methodId}
                onChange={setMethodId}
                operation="withdrawal"
              />
              {fieldErrors.methodId && (
                <p role="alert" className="text-xs text-destructive">
                  {fieldErrors.methodId}
                </p>
              )}

              {selected && <NetworkWarning method={selected} />}

              {/* ------------------------------------------------------ Amount */}
              <div className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-3">
                  <Label htmlFor="withdraw-amount" className="text-sm font-medium">
                    Amount (USD)
                  </Label>
                  <span className="text-[0.7rem] text-muted-foreground">
                    Available{" "}
                    <span data-numeric className="font-semibold text-foreground">
                      {formatCurrency(spendableCents)}
                    </span>
                  </span>
                </div>

                <Input
                  id="withdraw-amount"
                  name="amountUsd"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder={(effectiveMinimum / 100).toFixed(2)}
                  value={amountUsd}
                  onChange={(event) => setAmountUsd(event.target.value)}
                  aria-invalid={fieldErrors.amountUsd ? true : undefined}
                  aria-describedby="withdraw-amount-help"
                />

                <p
                  id="withdraw-amount-help"
                  className={cn(
                    "text-xs leading-relaxed",
                    fieldErrors.amountUsd
                      ? "text-destructive"
                      : "text-muted-foreground"
                  )}
                  {...(fieldErrors.amountUsd ? { role: "alert" } : {})}
                >
                  {fieldErrors.amountUsd ??
                    `Minimum ${formatCurrency(effectiveMinimum)}. Enforced server-side.`}
                </p>
              </div>

              {/* ------------------------------------------------------ Address */}
              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="withdraw-address"
                  className="text-sm font-medium"
                >
                  Destination wallet address
                </Label>

                <Input
                  id="withdraw-address"
                  name="destinationAddress"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={
                    selected?.network.addressFormat === "tron" ? "T…" : "0x…"
                  }
                  value={destinationAddress}
                  onChange={(event) => setDestinationAddress(event.target.value)}
                  aria-invalid={fieldErrors.destinationAddress ? true : undefined}
                  aria-describedby="withdraw-address-help"
                  className="font-mono text-xs"
                />

                <p
                  id="withdraw-address-help"
                  className={cn(
                    "text-xs leading-relaxed",
                    fieldErrors.destinationAddress
                      ? "text-destructive"
                      : "text-muted-foreground"
                  )}
                  {...(fieldErrors.destinationAddress ? { role: "alert" } : {})}
                >
                  {fieldErrors.destinationAddress ??
                    (selected
                      ? addressHints[selected.network.addressFormat]
                      : "Choose a network to see the expected address format.")}
                </p>
              </div>

              {/* ------------------------------------------------------- Quote */}
              <QuotePreview
                method={selected}
                quote={quote}
                quoting={quoting}
                notice={quoteNotice}
              />

              {message && (
                <p
                  role={messageTone === "error" ? "alert" : "status"}
                  className={cn(
                    "rounded-xl border p-4 text-xs leading-relaxed",
                    messageTone === "error"
                      ? "border-destructive/25 bg-destructive-surface text-foreground"
                      : "border-brand-border bg-brand-surface text-foreground"
                  )}
                >
                  {message}
                </p>
              )}

              <Button
                type="button"
                variant="accent"
                size="md"
                onClick={review}
                className="w-full"
              >
                Review withdrawal
              </Button>
            </>
          ) : (
            selected &&
            amountCents !== null && (
              <WithdrawalConfirmation
                method={selected}
                destinationAddress={destinationAddress.trim()}
                amountCents={amountCents}
                quote={quote}
                minimumCents={effectiveMinimum}
                confirmed={confirmed}
                onConfirmedChange={setConfirmed}
                onBack={() => setStep("form")}
                onSubmit={submit}
                submitting={submitting}
                message={message}
                messageTone={messageTone}
              />
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Live crypto equivalent.
 *
 * Renders one of three honest states: quoting, a real provider quote, or the
 * reason no quote exists. It never falls back to a computed estimate.
 */
function QuotePreview({
  method,
  quote,
  quoting,
  notice,
}: {
  method: PaymentMethod | null;
  quote: ExchangeQuote | null;
  quoting: boolean;
  notice: string | null;
}) {
  if (!method) return null;

  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-hairline bg-surface-2 p-4">
      <span className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
        You receive (estimated)
      </span>

      {quoting ? (
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <BrandedSpinner />
          Fetching the current rate…
        </span>
      ) : quote ? (
        <>
          <span
            data-numeric
            className="text-lg font-semibold text-brand-emphasis"
          >
            {formatAssetAmount(quote.netAssetAmount, method.asset.displayDecimals)}{" "}
            {method.asset.symbol}
          </span>
          <span className="text-[0.7rem] leading-relaxed text-muted-foreground">
            After a{" "}
            {formatAssetAmount(quote.networkFee, method.asset.displayDecimals)}{" "}
            {method.asset.symbol} network fee. Quoted by {quote.provider}; the exact
            amount is recalculated and re-validated when you submit.
          </span>
        </>
      ) : (
        <span className="text-xs leading-relaxed text-muted-foreground">
          {notice ??
            "Enter an amount at or above the minimum to see the current crypto equivalent."}
        </span>
      )}
    </div>
  );
}

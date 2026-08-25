"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { BrandedSpinner } from "@/components/brand/branded-loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MAX_DEPOSIT_CENTS,
  MAX_DEPOSIT_USDT,
  MIN_DEPOSIT_CENTS,
  MIN_DEPOSIT_USDT,
  usdtDepositNetworks,
} from "@/config/crypto";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usdStringToCents } from "@/lib/validations/wallet";
import { createDepositAction } from "@/lib/wallet/actions";

const PRESET_AMOUNTS = [1000, 5000, 10000, 25000, 50000];

type UsdtDepositFlowProps = {
  className?: string;
  onSuccess?: (depositId: string) => void;
};

export function UsdtDepositFlow({ className, onSuccess }: UsdtDepositFlowProps) {
  const router = useRouter();

  const [selectedNetwork, setSelectedNetwork] = React.useState<"usdt-bsc" | "usdt-ethereum">("usdt-bsc");
  const [amountInput, setAmountInput] = React.useState<string>("1000");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const amountCents = React.useMemo(() => {
    if (!amountInput || !/^\d+(\.\d{1,2})?$/.test(amountInput.trim())) {
      return 0;
    }
    return usdStringToCents(amountInput);
  }, [amountInput]);

  const isValidAmount =
    amountCents >= MIN_DEPOSIT_CENTS && amountCents <= MAX_DEPOSIT_CENTS;

  function handleAmountChange(val: string) {
    const cleaned = val.replace(/[^0-9.]/g, "");
    // Only allow one decimal point and at most 2 decimal places
    const parts = cleaned.split(".");
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;

    setAmountInput(cleaned);

    const cents = usdStringToCents(cleaned || "0");
    if (!cleaned) {
      setError("Please enter a deposit amount.");
    } else if (cents < MIN_DEPOSIT_CENTS) {
      setError(`Minimum deposit is ${MIN_DEPOSIT_USDT.toLocaleString("en-US")} USDT.`);
    } else if (cents > MAX_DEPOSIT_CENTS) {
      setError(`Maximum deposit is ${MAX_DEPOSIT_USDT.toLocaleString("en-US")} USDT.`);
    } else {
      setError(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!amountInput.trim()) {
      setError("Please enter a deposit amount.");
      return;
    }

    if (amountCents < MIN_DEPOSIT_CENTS) {
      setError(`Minimum deposit is ${MIN_DEPOSIT_USDT.toLocaleString("en-US")} USDT.`);
      return;
    }

    if (amountCents > MAX_DEPOSIT_CENTS) {
      setError(`Maximum deposit is ${MAX_DEPOSIT_USDT.toLocaleString("en-US")} USDT.`);
      return;
    }

    setSubmitting(true);

    try {
      const result = await createDepositAction({
        methodId: selectedNetwork,
        amountUsdt: amountInput.trim(),
      });

      if (result.status === "success") {
        toast.success("Deposit request initiated. Proceeding to payment...");
        if (onSuccess) {
          onSuccess(result.depositId);
        } else {
          router.push(result.redirectTo);
        }
      } else {
        const errorMsg =
          ("fieldErrors" in result && result.fieldErrors?.amountUsdt) ||
          result.message ||
          "Failed to start deposit. Please check your inputs.";
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch {
      const msg = "A network error occurred. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("flex flex-col gap-6", className)}
    >
      {/* -------------------------------------------------- 1. Asset Selection (USDT only) */}
      <div className="flex flex-col gap-2.5">
        <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Asset
        </Label>
        <div className="flex items-center justify-between rounded-2xl border border-hairline bg-surface-2 p-4 shadow-soft">
          <div className="flex items-center gap-3.5">
            <div className="grid size-11 place-items-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
              <span className="text-sm font-bold tracking-tight">₮</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-foreground">
                  USDT
                </span>
                <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[0.68rem] font-medium text-muted-foreground">
                  Tether USD
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                Stablecoin pegged 1:1 to USD
              </span>
            </div>
          </div>

          <span className="text-xs font-medium text-emerald-400">
            Selected
          </span>
        </div>
      </div>

      {/* -------------------------------------------------- 2. Network Selection */}
      <div className="flex flex-col gap-2.5">
        <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Select Network
        </Label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* BEP-20 */}
          <button
            type="button"
            onClick={() => setSelectedNetwork("usdt-bsc")}
            className={cn(
              "flex cursor-pointer items-start justify-between rounded-2xl border p-4 text-left transition-all duration-200",
              selectedNetwork === "usdt-bsc"
                ? "border-brand bg-brand-surface shadow-card ring-1 ring-brand/50"
                : "border-hairline bg-surface-1 hover:border-hairline-strong hover:bg-surface-2"
            )}
          >
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-foreground">
                BEP-20
              </span>
              <span className="text-xs text-muted-foreground">
                USDT on BNB Smart Chain
              </span>
              <span className="mt-1.5 text-[0.68rem] font-medium text-brand-emphasis">
                Fast · Low Network Fee
              </span>
            </div>
            {selectedNetwork === "usdt-bsc" && (
              <CheckCircle2 className="size-5 shrink-0 text-brand" />
            )}
          </button>

          {/* ERC-20 */}
          <button
            type="button"
            onClick={() => setSelectedNetwork("usdt-ethereum")}
            className={cn(
              "flex cursor-pointer items-start justify-between rounded-2xl border p-4 text-left transition-all duration-200",
              selectedNetwork === "usdt-ethereum"
                ? "border-brand bg-brand-surface shadow-card ring-1 ring-brand/50"
                : "border-hairline bg-surface-1 hover:border-hairline-strong hover:bg-surface-2"
            )}
          >
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-foreground">
                ERC-20
              </span>
              <span className="text-xs text-muted-foreground">
                USDT on Ethereum
              </span>
              <span className="mt-1.5 text-[0.68rem] font-medium text-muted-foreground">
                High Security
              </span>
            </div>
            {selectedNetwork === "usdt-ethereum" && (
              <CheckCircle2 className="size-5 shrink-0 text-brand" />
            )}
          </button>
        </div>
      </div>

      {/* -------------------------------------------------- 3. Amount Entry */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <Label
            htmlFor="deposit-amount"
            className="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
          >
            Enter Amount (USDT)
          </Label>
          <span className="text-xs text-muted-foreground">
            Limits: {MIN_DEPOSIT_USDT.toLocaleString("en-US")} –{" "}
            {MAX_DEPOSIT_USDT.toLocaleString("en-US")} USDT
          </span>
        </div>

        <div className="relative">
          <Input
            id="deposit-amount"
            type="text"
            inputMode="decimal"
            placeholder="1000"
            value={amountInput}
            onChange={(e) => handleAmountChange(e.target.value)}
            disabled={submitting}
            className={cn(
              "h-14 pr-20 pl-4 text-xl font-semibold tracking-tight sm:text-2xl",
              error ? "border-destructive focus-visible:ring-destructive" : ""
            )}
          />
          <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center gap-1.5">
            <span className="text-sm font-bold text-muted-foreground">
              USDT
            </span>
          </div>
        </div>

        {/* Quick Amount Preset Chips */}
        <div className="flex flex-wrap gap-2 pt-1">
          {PRESET_AMOUNTS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => handleAmountChange(String(preset))}
              disabled={submitting}
              className={cn(
                "cursor-pointer rounded-xl border border-hairline px-3 py-1.5 text-xs font-semibold transition-all duration-150",
                amountInput === String(preset)
                  ? "border-brand bg-brand text-brand-foreground shadow-sm"
                  : "bg-surface-2 text-muted-foreground hover:border-hairline-strong hover:text-foreground"
              )}
            >
              {preset.toLocaleString("en-US")} USDT
            </button>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/25 bg-destructive-surface p-3 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* -------------------------------------------------- Summary & Policy */}
      <div className="rounded-2xl border border-hairline bg-surface-1 p-4 shadow-soft">
        <div className="flex flex-col divide-y divide-hairline text-xs">
          <div className="flex items-center justify-between pb-2.5">
            <span className="text-muted-foreground">Deposit Amount</span>
            <span data-numeric className="font-semibold text-foreground">
              {amountCents > 0
                ? `${formatCurrency(amountCents)} USDT`
                : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <span className="text-muted-foreground">Network</span>
            <span className="font-medium text-foreground">
              {usdtDepositNetworks[selectedNetwork].chainTitle} (
              {usdtDepositNetworks[selectedNetwork].protocol})
            </span>
          </div>
          <div className="flex items-center justify-between pt-2.5">
            <span className="text-muted-foreground">Payment Window</span>
            <span className="font-medium text-brand-emphasis">
              1 Hour Countdown
            </span>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------- Submit */}
      <Button
        type="submit"
        variant="accent"
        size="lg"
        disabled={submitting || !isValidAmount}
        className="w-full text-base font-semibold"
      >
        {submitting ? (
          <>
            <BrandedSpinner />
            Generating Deposit Request...
          </>
        ) : (
          <>
            Continue to Payment
            <ArrowRight />
          </>
        )}
      </Button>

      <div className="flex items-center justify-center gap-2 text-center text-[0.72rem] text-muted-foreground">
        <ShieldCheck className="size-3.5 text-brand" />
        <span>
          Your deposit request is generated securely. Wallet is credited upon receipt verification.
        </span>
      </div>
    </form>
  );
}

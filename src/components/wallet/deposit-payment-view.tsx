"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Copy,
  FileCheck2,
  FileText,
  ShieldAlert,
  Upload,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { BrandedSpinner } from "@/components/brand/branded-loader";
import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DEPOSIT_NETWORK_WARNING, usdtDepositNetworks } from "@/config/crypto";
import { appRoutes } from "@/config/navigation";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  cancelDepositAction,
  submitDepositProofAction,
} from "@/lib/wallet/actions";
import type { DepositRecord } from "@/types/crypto";

type DepositPaymentViewProps = {
  deposit: DepositRecord;
};

type ViewStep = "payment" | "upload" | "submitted";

export function DepositPaymentView({ deposit }: DepositPaymentViewProps) {
  const router = useRouter();

  // If the deposit is already in pending_review or another terminal state
  const isPendingReview = deposit.status === "pending_review";
  const isApproved = deposit.status === "approved" || deposit.status === "credited";
  const isDeclined = deposit.status === "declined";
  const isExpired = deposit.status === "expired";
  const isCancelled = deposit.status === "cancelled";

  const [step, setStep] = React.useState<ViewStep>(
    isPendingReview ? "submitted" : "payment"
  );

  const calculateRemaining = React.useCallback(() => {
    if (!deposit.expiresAt || isApproved || isDeclined || isCancelled) {
      return null;
    }
    const expires = new Date(deposit.expiresAt).getTime();
    return Math.max(0, Math.floor((expires - Date.now()) / 1000));
  }, [deposit.expiresAt, isApproved, isDeclined, isCancelled]);

  const [secondsRemaining, setSecondsRemaining] = React.useState<number | null>(
    () => calculateRemaining()
  );

  const [hasExpired, setHasExpired] = React.useState(
    () => isExpired || (calculateRemaining() !== null && calculateRemaining()! <= 0)
  );

  const [copied, setCopied] = React.useState(false);
  const [showCancelDialog, setShowCancelDialog] = React.useState(false);
  const [cancelling, setCancelling] = React.useState(false);

  // File upload state
  const [file, setFile] = React.useState<File | null>(null);
  const [filePreview, setFilePreview] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);

  // Auto redirect countdown on submitted step
  const [redirectCountdown, setRedirectCountdown] = React.useState<number>(3);

  // Config based on network
  const methodKey = deposit.methodId as "usdt-bsc" | "usdt-ethereum";
  const networkConfig = usdtDepositNetworks[methodKey] ?? usdtDepositNetworks["usdt-bsc"];
  const receivingAddress =
    deposit.receivingAddress || networkConfig.receivingAddress;
  const qrImagePath = networkConfig.qrImagePath;

  // 1-Hour Countdown timer
  React.useEffect(() => {
    if (!deposit.expiresAt || isApproved || isDeclined || isCancelled) {
      return;
    }

    const interval = setInterval(() => {
      const remaining = calculateRemaining();
      setSecondsRemaining(remaining);
      if (remaining !== null && remaining <= 0) {
        clearInterval(interval);
        setHasExpired(true);
        router.refresh();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [deposit.expiresAt, isApproved, isDeclined, isCancelled, calculateRemaining, router]);

  // Auto return to dashboard on submission
  React.useEffect(() => {
    if (step === "submitted" && !isPendingReview) {
      const timer = setInterval(() => {
        setRedirectCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            router.push(appRoutes.dashboard);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step, isPendingReview, router]);

  const minutes = Math.floor((secondsRemaining ?? 0) / 60);
  const seconds = (secondsRemaining ?? 0) % 60;
  const timeFormatted = `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(receivingAddress);
      setCopied(true);
      toast.success("Receiving address copied to clipboard.");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Failed to copy address.");
    }
  };

  const handleCancelDeposit = async () => {
    setCancelling(true);
    try {
      const result = await cancelDepositAction(deposit.id);
      if (result.status === "success") {
        toast.success("Deposit request cancelled.");
        setShowCancelDialog(false);
        router.push(appRoutes.wallet);
      } else {
        toast.error(result.message || "Could not cancel deposit.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setUploadError(null);

    const allowedMimes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    if (!allowedMimes.includes(selected.type)) {
      setUploadError(
        "Invalid file type. Please select a JPG, PNG, WEBP image or PDF file."
      );
      return;
    }

    if (selected.size > 10 * 1024 * 1024) {
      setUploadError("File is too large. Maximum size is 10 MB.");
      return;
    }

    setFile(selected);

    if (selected.type.startsWith("image/")) {
      const previewUrl = URL.createObjectURL(selected);
      setFilePreview(previewUrl);
    } else {
      setFilePreview(null);
    }
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setUploadError("Please choose a receipt file to upload.");
      return;
    }

    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("depositId", deposit.id);
    formData.append("receipt", file);

    try {
      const result = await submitDepositProofAction(formData);
      if (result.status === "success") {
        setStep("submitted");
        toast.success("Payment proof submitted successfully.");
      } else {
        setUploadError(result.message || "Failed to submit receipt.");
        toast.error(result.message || "Failed to submit receipt.");
      }
    } catch {
      const msg = "Network error. Please check your connection and retry.";
      setUploadError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  // ------------------------------------------------------------- Terminal / Settled States
  if (isApproved) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-6 text-center">
        <div className="grid size-16 place-items-center rounded-2xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-400">
          <CheckCircle2 className="size-8" />
        </div>

        <div className="flex flex-col gap-2">
          <StatusPill tone="success" dot className="self-center">
            Approved & Credited
          </StatusPill>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Deposit Confirmed
          </h1>
          <p className="text-sm text-muted-foreground">
            Your deposit of{" "}
            <strong className="text-foreground">
              {formatCurrency(deposit.amountCents)} USDT
            </strong>{" "}
            has been approved and credited to your available balance.
          </p>
        </div>

        <div className="w-full rounded-2xl border border-hairline bg-surface-1 p-5 text-left text-xs">
          <div className="flex flex-col divide-y divide-hairline">
            <div className="flex items-center justify-between pb-2.5">
              <span className="text-muted-foreground">Deposit Reference</span>
              <span data-numeric className="font-semibold text-foreground">
                {deposit.reference}
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-muted-foreground">Network</span>
              <span className="font-medium text-foreground">
                {networkConfig.chainTitle}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2.5">
              <span className="text-muted-foreground">Credited Amount</span>
              <span data-numeric className="font-semibold text-emerald-400">
                {formatCurrency(deposit.creditedCents || deposit.amountCents)} USDT
              </span>
            </div>
          </div>
        </div>

        <div className="flex w-full gap-3">
          <Button asChild variant="accent" size="lg" className="flex-1">
            <Link href={appRoutes.wallet}>View Wallet</Link>
          </Button>
          <Button asChild variant="hairline" size="lg" className="flex-1">
            <Link href={appRoutes.dashboard}>Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isDeclined) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-6 text-center">
        <div className="grid size-16 place-items-center rounded-2xl border border-destructive/25 bg-destructive/10 text-destructive">
          <XCircle className="size-8" />
        </div>

        <div className="flex flex-col gap-2">
          <StatusPill tone="danger" dot className="self-center">
            Declined
          </StatusPill>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Deposit Declined
          </h1>
          <p className="text-sm text-muted-foreground">
            Your deposit request could not be approved.
          </p>
        </div>

        {deposit.rejectionReason && (
          <div className="w-full rounded-2xl border border-destructive/30 bg-destructive-surface p-4 text-left text-sm text-foreground">
            <p className="font-semibold text-destructive">Decline Reason:</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {deposit.rejectionReason}
            </p>
          </div>
        )}

        <div className="flex w-full gap-3">
          <Button asChild variant="accent" size="lg" className="flex-1">
            <Link href={appRoutes.deposit}>New Deposit</Link>
          </Button>
          <Button asChild variant="hairline" size="lg" className="flex-1">
            <Link href={appRoutes.wallet}>Back to Wallet</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (hasExpired || isExpired) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-6 text-center">
        <div className="grid size-16 place-items-center rounded-2xl border border-hairline bg-surface-2 text-muted-foreground">
          <Clock className="size-8" />
        </div>

        <div className="flex flex-col gap-2">
          <StatusPill tone="neutral" dot className="self-center">
            Expired
          </StatusPill>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Deposit Request Expired
          </h1>
          <p className="text-sm text-muted-foreground">
            The 1-hour payment window for this deposit has expired. If you
            haven&apos;t made the transfer, please initiate a new deposit.
          </p>
        </div>

        <div className="flex w-full gap-3">
          <Button asChild variant="accent" size="lg" className="flex-1">
            <Link href={appRoutes.deposit}>Start New Deposit</Link>
          </Button>
          <Button asChild variant="hairline" size="lg" className="flex-1">
            <Link href={appRoutes.wallet}>Back to Wallet</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isCancelled) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-6 text-center">
        <div className="grid size-16 place-items-center rounded-2xl border border-hairline bg-surface-2 text-muted-foreground">
          <XCircle className="size-8" />
        </div>

        <div className="flex flex-col gap-2">
          <StatusPill tone="neutral" dot className="self-center">
            Cancelled
          </StatusPill>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Deposit Cancelled
          </h1>
          <p className="text-sm text-muted-foreground">
            This deposit request was cancelled.
          </p>
        </div>

        <Button asChild variant="accent" size="lg" className="w-full sm:w-auto">
          <Link href={appRoutes.deposit}>Create New Deposit</Link>
        </Button>
      </div>
    );
  }

  // ------------------------------------------------------------- Submitted / Pending Review State
  if (step === "submitted") {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-6 text-center">
        <div className="grid size-16 place-items-center rounded-2xl border border-brand/35 bg-brand-surface text-brand-emphasis shadow-soft">
          <FileCheck2 className="size-8 text-brand" />
        </div>

        <div className="flex flex-col gap-2">
          <StatusPill tone="info" dot className="self-center">
            Payment Pending Review
          </StatusPill>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Payment Pending Review
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            Your payment proof has been submitted successfully and is pending review.
          </p>
        </div>

        <div className="w-full rounded-2xl border border-hairline bg-surface-1 p-5 text-left text-xs shadow-soft">
          <div className="flex flex-col divide-y divide-hairline">
            <div className="flex items-center justify-between pb-2.5">
              <span className="text-muted-foreground">Deposit Amount</span>
              <span data-numeric className="font-semibold text-foreground">
                {formatCurrency(deposit.amountCents)} USDT
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-muted-foreground">Network</span>
              <span className="font-medium text-foreground">
                {networkConfig.chainTitle}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2.5">
              <span className="text-muted-foreground">Reference</span>
              <span data-numeric className="font-semibold text-brand-emphasis">
                {deposit.reference}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <p className="text-xs text-muted-foreground">
            Returning to dashboard in{" "}
            <span data-numeric className="font-semibold text-foreground">
              {redirectCountdown}s
            </span>
            ...
          </p>

          <Button asChild variant="accent" size="lg" className="w-full sm:w-auto">
            <Link href={appRoutes.dashboard}>Return to Dashboard Now</Link>
          </Button>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------- Step 2: Upload Payment Receipt
  if (step === "upload") {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-6">
        <button
          type="button"
          onClick={() => setStep("payment")}
          className="flex items-center gap-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to payment details
        </button>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <p className="eyebrow text-brand-emphasis">Step 2 of 2</p>
            {secondsRemaining !== null && (
              <span
                data-numeric
                className="flex items-center gap-1.5 rounded-full border border-brand-border bg-brand-surface px-2.5 py-1 text-xs font-semibold text-brand-emphasis"
              >
                <Clock className="size-3.5" />
                {timeFormatted}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Upload Payment Receipt
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Please provide a screenshot or document verifying your USDT transfer.
          </p>
        </div>

        {/* Deposit Summary */}
        <div className="rounded-2xl border border-hairline bg-surface-1 p-4 shadow-soft">
          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground">Deposit Amount</span>
              <span data-numeric className="font-semibold text-foreground">
                {formatCurrency(deposit.amountCents)} USDT
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground">Network</span>
              <span className="font-medium text-foreground">
                {networkConfig.protocol}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground">Deposit Reference</span>
              <span data-numeric className="font-semibold text-brand-emphasis">
                {deposit.reference}
              </span>
            </div>
          </div>
        </div>

        {/* Upload Form */}
        <form onSubmit={handleSubmitProof} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="receipt-upload"
              className={cn(
                "group relative flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-200",
                file
                  ? "border-brand/60 bg-brand-surface"
                  : "border-hairline-strong bg-surface-1 hover:border-brand hover:bg-surface-2"
              )}
            >
              <input
                id="receipt-upload"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleFileSelect}
                disabled={uploading}
                className="sr-only"
              />

              {file ? (
                <div className="flex flex-col items-center gap-3">
                  {filePreview ? (
                    <div className="relative size-24 overflow-hidden rounded-xl border border-hairline shadow-md">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={filePreview}
                        alt="Receipt preview"
                        className="size-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="grid size-16 place-items-center rounded-xl bg-surface-3 text-brand">
                      <FileText className="size-8" />
                    </div>
                  )}

                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-foreground">
                      {file.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB · Click to change file
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="grid size-12 place-items-center rounded-2xl border border-hairline bg-surface-2 text-muted-foreground group-hover:text-brand">
                    <Upload className="size-6" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-foreground">
                      Click to upload receipt or drag and drop
                    </span>
                    <span className="text-xs text-muted-foreground">
                      JPG, PNG, WEBP or PDF (max 10MB)
                    </span>
                  </div>
                </div>
              )}
            </label>

            {uploadError && (
              <div className="flex items-center gap-2 rounded-xl border border-destructive/25 bg-destructive-surface p-3 text-xs text-destructive">
                <AlertTriangle className="size-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>

          <Button
            type="submit"
            variant="accent"
            size="lg"
            disabled={!file || uploading}
            className="w-full text-base font-semibold"
          >
            {uploading ? (
              <>
                <BrandedSpinner />
                Submitting Payment Proof...
              </>
            ) : (
              <>
                Submit Payment Proof
                <ArrowRight />
              </>
            )}
          </Button>
        </form>
      </div>
    );
  }

  // ------------------------------------------------------------- Step 1: Payment Screen (Default)
  return (
    <>
      <div className="mx-auto flex max-w-xl flex-col gap-6">
        {/* Header with 1-Hour Countdown */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="eyebrow text-brand-emphasis">Deposit Payment</p>
            {secondsRemaining !== null && (
              <div
                data-numeric
                className="flex items-center gap-1.5 rounded-full border border-brand-border bg-brand-surface px-3 py-1 text-xs font-semibold text-brand-emphasis shadow-soft"
              >
                <Clock className="size-3.5 animate-pulse" />
                <span>{timeFormatted} remaining</span>
              </div>
            )}
          </div>

          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Send USDT
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Transfer exactly{" "}
            <strong className="text-foreground">
              {formatCurrency(deposit.amountCents)} USDT
            </strong>{" "}
            to the receiving address below.
          </p>
        </div>

        {/* Warning Banner */}
        <div className="flex gap-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs leading-relaxed text-foreground shadow-soft">
          <ShieldAlert
            aria-hidden="true"
            className="mt-0.5 size-4.5 shrink-0 text-amber-500"
          />
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-amber-400">Important Network Notice</span>
            <p className="text-muted-foreground">{DEPOSIT_NETWORK_WARNING}</p>
          </div>
        </div>

        {/* Payment Details Card */}
        <div className="flex flex-col items-center gap-6 rounded-3xl border border-hairline bg-surface-1 p-6 shadow-card">
          {/* QR Code */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative size-56 overflow-hidden rounded-2xl border border-hairline bg-white p-3 shadow-md sm:size-64">
              <Image
                src={qrImagePath}
                alt={`QR Code for ${networkConfig.chainTitle} USDT receiving address`}
                fill
                sizes="(max-width: 640px) 224px, 256px"
                className="object-contain p-1"
                priority
              />
            </div>
            <span className="text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">
              Scan QR with your {networkConfig.protocol} Wallet
            </span>
          </div>

          {/* Amount & Network Overview */}
          <div className="grid w-full grid-cols-2 gap-3 rounded-2xl border border-hairline bg-surface-2 p-3 text-center text-xs">
            <div className="flex flex-col gap-0.5">
              <span className="text-muted-foreground">Amount to Send</span>
              <span data-numeric className="text-base font-bold text-foreground">
                {formatCurrency(deposit.amountCents)} USDT
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-muted-foreground">Selected Network</span>
              <span className="text-base font-semibold text-brand-emphasis">
                {networkConfig.protocol}
              </span>
            </div>
          </div>

          {/* Receiving Address & Copy Field */}
          <div className="flex w-full flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Receiving Address
              </span>
              <span className="text-[0.68rem] text-muted-foreground">
                {networkConfig.networkName}
              </span>
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-hairline bg-surface-2 p-2 sm:p-2.5">
              <input
                type="text"
                readOnly
                value={receivingAddress}
                className="w-full bg-transparent px-2 font-mono text-xs text-foreground select-all focus:outline-none sm:text-sm"
              />
              <Button
                type="button"
                variant={copied ? "accent" : "hairline"}
                size="sm"
                onClick={copyToClipboard}
                className="shrink-0 gap-1.5"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="size-3.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Reference */}
          <div className="flex w-full items-center justify-between border-t border-hairline pt-4 text-xs">
            <span className="text-muted-foreground">Deposit Reference</span>
            <span data-numeric className="font-mono font-semibold text-foreground">
              {deposit.reference}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <Button
            type="button"
            variant="accent"
            size="lg"
            onClick={() => setStep("upload")}
            className="w-full text-base font-semibold"
          >
            I Have Made My Payment
            <ArrowRight />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={() => setShowCancelDialog(true)}
            className="text-muted-foreground hover:text-destructive"
          >
            <XCircle className="size-4" />
            Cancel Deposit
          </Button>
        </div>
      </div>

      {/* Confirmation Dialog for Cancellation */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mb-2 grid size-10 place-items-center rounded-xl bg-destructive/10 text-destructive">
              <AlertTriangle className="size-5" />
            </div>
            <DialogTitle>Cancel Deposit?</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this deposit of{" "}
              <strong>{formatCurrency(deposit.amountCents)} USDT</strong>? If
              you have already sent funds on-chain, please do not cancel and
              instead upload your receipt.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="hairline"
              size="md"
              onClick={() => setShowCancelDialog(false)}
              disabled={cancelling}
            >
              Go Back
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="md"
              onClick={handleCancelDeposit}
              disabled={cancelling}
            >
              {cancelling && <BrandedSpinner />}
              Yes, Cancel Deposit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

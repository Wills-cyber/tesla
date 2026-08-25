"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CheckCircle2,
  Eye,
  ExternalLink,
  FileText,
  Filter,
  ImageOff,
  RefreshCw,
  Search,
  ShieldCheck,
  AlertTriangle,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { AdminReceiptModal } from "@/components/admin/admin-receipt-modal";
import { BrandedSpinner } from "@/components/brand/branded-loader";
import { EmptyState } from "@/components/common/empty-state";
import { StatusPill, type PillTone } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  adminApproveDepositAction,
  adminDeclineDepositAction,
} from "@/lib/wallet/actions";
import type { DepositRecord, DepositRecordStatus } from "@/types/crypto";

const DECLINE_REASONS = [
  "Invalid payment proof",
  "Wrong network",
  "Amount mismatch",
  "Receipt unclear",
  "Payment could not be verified",
  "Other",
];

const STATUS_CONFIG: Record<
  DepositRecordStatus,
  { label: string; tone: PillTone }
> = {
  pending_review: { label: "Pending Review", tone: "warning" },
  pending: { label: "Pending Payment", tone: "neutral" },
  approved: { label: "Approved", tone: "success" },
  credited: { label: "Credited", tone: "success" },
  declined: { label: "Declined", tone: "danger" },
  expired: { label: "Expired", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  awaiting_funds: { label: "Awaiting Funds", tone: "neutral" },
  confirmed: { label: "Confirmed", tone: "info" },
  failed: { label: "Failed", tone: "danger" },
};

type AdminDepositReviewProps = {
  deposits: DepositRecord[];
};

export function AdminDepositReview({ deposits }: AdminDepositReviewProps) {
  const router = useRouter();

  const [activeTab, setActiveTab] = React.useState<string>("pending_review");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  // Modal states
  const [viewingReceipt, setViewingReceipt] = React.useState<{
    depositId: string;
    reference: string;
  } | null>(null);

  const [approvingDeposit, setApprovingDeposit] = React.useState<DepositRecord | null>(null);
  const [approveLoading, setApproveLoading] = React.useState(false);

  const [decliningDeposit, setDecliningDeposit] = React.useState<DepositRecord | null>(null);
  const [selectedReason, setSelectedReason] = React.useState<string>(DECLINE_REASONS[0]);
  const [customReason, setCustomReason] = React.useState<string>("");
  const [declineLoading, setDeclineLoading] = React.useState(false);

  // Filter deposits
  const filteredDeposits = React.useMemo(() => {
    return deposits.filter((deposit) => {
      // Tab filter
      if (activeTab === "pending_review" && deposit.status !== "pending_review") {
        return false;
      }
      if (activeTab === "pending" && deposit.status !== "pending") {
        return false;
      }
      if (
        activeTab === "approved" &&
        deposit.status !== "approved" &&
        deposit.status !== "credited"
      ) {
        return false;
      }
      if (activeTab === "declined" && deposit.status !== "declined") {
        return false;
      }
      if (
        activeTab === "expired_cancelled" &&
        deposit.status !== "expired" &&
        deposit.status !== "cancelled"
      ) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchRef = deposit.reference.toLowerCase().includes(query);
        const matchEmail = deposit.userEmail?.toLowerCase().includes(query) ?? false;
        const matchName = deposit.userFullName?.toLowerCase().includes(query) ?? false;
        const matchAddr = deposit.receivingAddress.toLowerCase().includes(query);
        return matchRef || matchEmail || matchName || matchAddr;
      }

      return true;
    });
  }, [deposits, activeTab, searchQuery]);

  const pendingReviewCount = React.useMemo(() => {
    return deposits.filter((d) => d.status === "pending_review").length;
  }, [deposits]);

  // Handle Approve
  async function handleConfirmApprove() {
    if (!approvingDeposit) return;
    setApproveLoading(true);

    try {
      const result = await adminApproveDepositAction({
        depositId: approvingDeposit.id,
      });

      if (result.status === "success") {
        toast.success(result.message || "Deposit approved and user wallet credited.");
        setApprovingDeposit(null);
        router.refresh();
      } else {
        toast.error(result.message || "Failed to approve deposit.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setApproveLoading(false);
    }
  }

  // Handle Decline
  async function handleConfirmDecline() {
    if (!decliningDeposit) return;

    const finalReason =
      selectedReason === "Other"
        ? customReason.trim()
        : selectedReason;

    if (!finalReason) {
      toast.error("Please specify a reason for declining this deposit.");
      return;
    }

    setDeclineLoading(true);

    try {
      const result = await adminDeclineDepositAction({
        depositId: decliningDeposit.id,
        reason: finalReason,
      });

      if (result.status === "success") {
        toast.success("Deposit declined.");
        setDecliningDeposit(null);
        setSelectedReason(DECLINE_REASONS[0]);
        setCustomReason("");
        router.refresh();
      } else {
        toast.error(result.message || "Failed to decline deposit.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setDeclineLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ---------------------------------------------------- Filter Tabs & Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-hairline bg-surface-1 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("pending_review")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-150",
              activeTab === "pending_review"
                ? "bg-brand text-brand-foreground shadow-sm"
                : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            )}
          >
            <span>Pending Review</span>
            {pendingReviewCount > 0 && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.2 text-[0.65rem] font-bold",
                  activeTab === "pending_review"
                    ? "bg-black/20 text-brand-foreground"
                    : "bg-brand-surface-strong text-brand-emphasis"
                )}
              >
                {pendingReviewCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={cn(
              "rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-150",
              activeTab === "all"
                ? "bg-brand text-brand-foreground shadow-sm"
                : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            )}
          >
            All ({deposits.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("approved")}
            className={cn(
              "rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-150",
              activeTab === "approved"
                ? "bg-brand text-brand-foreground shadow-sm"
                : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            )}
          >
            Approved
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("declined")}
            className={cn(
              "rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-150",
              activeTab === "declined"
                ? "bg-brand text-brand-foreground shadow-sm"
                : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            )}
          >
            Declined
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("pending")}
            className={cn(
              "rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-150",
              activeTab === "pending"
                ? "bg-brand text-brand-foreground shadow-sm"
                : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            )}
          >
            Awaiting Proof
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("expired_cancelled")}
            className={cn(
              "rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-150",
              activeTab === "expired_cancelled"
                ? "bg-brand text-brand-foreground shadow-sm"
                : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            )}
          >
            Expired/Cancelled
          </button>
        </div>

        {/* Search Bar & Refresh */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64 sm:flex-initial">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search ref, email, address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-8 text-xs"
            />
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.refresh()}
            title="Refresh deposits"
          >
            <RefreshCw className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* ---------------------------------------------------- Deposits List */}
      {filteredDeposits.length === 0 ? (
        <EmptyState
          icon={Filter}
          title="No deposit requests found"
          description={
            searchQuery
              ? "No deposits match your search filter."
              : activeTab === "pending_review"
              ? "There are currently no deposits pending administrator review."
              : "No deposits in this category."
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filteredDeposits.map((deposit) => {
            const statusInfo =
              STATUS_CONFIG[deposit.status] || {
                label: deposit.status,
                tone: "neutral" as PillTone,
              };

            const networkLabel = deposit.methodId.includes("bsc")
              ? "BEP-20 (BNB Smart Chain)"
              : "ERC-20 (Ethereum)";

            const hasReceipt = Boolean(deposit.receiptPath || deposit.receiptUrl);
            const isImageReceipt = hasReceipt && deposit.receiptIsPdf !== true;
            const previewUrl = deposit.receiptSignedUrl ?? null;

            // Every request in the pending queue shows both actions. Approve is
            // disabled until a receipt is attached — and the database refuses to
            // approve a deposit without proof, so the button is a mirror of a
            // rule that also holds server-side.
            const isActionable =
              deposit.status === "pending_review" || deposit.status === "pending";

            return (
              <div
                key={deposit.id}
                className={cn(
                  "flex flex-col gap-4 rounded-2xl border p-5 shadow-card transition-all duration-200",
                  deposit.status === "pending_review"
                    ? "border-amber-500/30 bg-amber-500/[0.02]"
                    : "border-hairline bg-surface-1"
                )}
              >
                {/* Header row */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid size-10 place-items-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                      <span className="text-sm font-bold">₮</span>
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span data-numeric className="text-lg font-bold text-foreground">
                          {formatCurrency(deposit.amountCents)} USDT
                        </span>
                        <StatusPill tone={statusInfo.tone} dot>
                          {statusInfo.label}
                        </StatusPill>
                      </div>

                      <span className="text-xs text-muted-foreground">
                        Network:{" "}
                        <strong className="text-foreground">{networkLabel}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 text-xs">
                    <span className="font-mono font-semibold text-brand-emphasis">
                      {deposit.reference}
                    </span>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-1 gap-2 rounded-xl border border-hairline bg-surface-2 p-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[0.68rem] text-muted-foreground uppercase">
                      User / Account
                    </span>
                    <span className="truncate font-medium text-foreground">
                      {deposit.userFullName || "User"}
                    </span>
                    <span className="truncate text-[0.7rem] text-muted-foreground">
                      {deposit.userEmail || "—"}
                    </span>
                    <span
                      className="truncate font-mono text-[0.68rem] text-muted-foreground"
                      title={deposit.userId}
                    >
                      ID: {deposit.userId}
                    </span>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <span className="text-[0.68rem] text-muted-foreground uppercase">
                      Deposit Address
                    </span>
                    <span className="break-all font-mono text-[0.72rem] text-foreground">
                      {deposit.receivingAddress}
                    </span>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <span className="text-[0.68rem] text-muted-foreground uppercase">
                      Requested
                    </span>
                    <span className="text-[0.72rem] text-foreground">
                      {formatDateTime(deposit.createdAt)}
                    </span>
                    {deposit.expiresAt &&
                      (deposit.status === "pending" ||
                        deposit.status === "pending_review") && (
                        <span className="text-[0.68rem] text-muted-foreground">
                          Proof window closes {formatDateTime(deposit.expiresAt)}
                        </span>
                      )}
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <span className="text-[0.68rem] text-muted-foreground uppercase">
                      Review Audit
                    </span>
                    {deposit.reviewedAt ? (
                      <>
                        <span className="text-[0.7rem] text-muted-foreground">
                          Reviewed {formatDateTime(deposit.reviewedAt)}
                        </span>
                        {deposit.creditedCents != null && (
                          <span
                            data-numeric
                            className="text-[0.7rem] font-semibold text-emerald-400"
                          >
                            Credited {formatCurrency(deposit.creditedCents)}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-amber-400">Awaiting review</span>
                    )}
                  </div>
                </div>

                {/* Payment Receipt Proof — inline preview from the PRIVATE bucket */}
                <div className="flex flex-col gap-2.5 rounded-xl border border-hairline bg-surface-2 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[0.68rem] text-muted-foreground uppercase">
                      Payment Receipt Proof
                    </span>
                    {hasReceipt ? (
                      <span className="flex items-center gap-1 text-[0.7rem] font-semibold text-emerald-400">
                        <CheckCircle2 className="size-3.5" />
                        Submitted
                        {deposit.receiptSubmittedAt
                          ? ` · ${formatDateTime(deposit.receiptSubmittedAt)}`
                          : ""}
                      </span>
                    ) : (
                      <span className="text-[0.7rem] text-muted-foreground">
                        Awaiting user upload
                      </span>
                    )}
                  </div>

                  {hasReceipt ? (
                    <div className="flex flex-wrap items-center gap-3">
                      {isImageReceipt && previewUrl ? (
                        <div
                          className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-hairline bg-black/40"
                          title="Click View Receipt for the full size image"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={previewUrl}
                            alt={`Receipt preview for ${deposit.reference}`}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ) : isImageReceipt ? (
                        <div
                          className="grid h-16 w-16 shrink-0 place-items-center rounded-lg border border-hairline bg-surface-3 text-muted-foreground"
                          title="Preview unavailable — open View Receipt to fetch a fresh signed link"
                        >
                          <ImageOff className="size-5" />
                        </div>
                      ) : (
                        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-surface-3 text-brand">
                          <FileText className="size-6" />
                        </div>
                      )}

                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="text-xs font-semibold text-foreground">
                          {isImageReceipt ? "Image receipt" : "PDF receipt"}
                        </span>
                        <span className="text-[0.7rem] leading-relaxed text-muted-foreground">
                          {previewUrl
                            ? "Private bucket · secure signed link, valid 1 hour"
                            : "Stored in the private deposit-receipts bucket — open View Receipt to fetch a fresh link"}
                        </span>
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        {previewUrl && (
                          <Button
                            asChild
                            variant="hairline"
                            size="sm"
                            className="gap-1.5"
                          >
                            <a
                              href={previewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {isImageReceipt ? "View Full" : "Open Receipt"}
                              <ExternalLink className="size-3" />
                            </a>
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="hairline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() =>
                            setViewingReceipt({
                              depositId: deposit.id,
                              reference: deposit.reference,
                            })
                          }
                        >
                          <Eye className="size-3.5" />
                          View Receipt
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No receipt attached yet. The user has been asked to upload
                      payment proof — Approve unlocks automatically once it
                      arrives.
                    </p>
                  )}
                </div>

                {/* Decline reason notice if declined */}
                {deposit.rejectionReason && (
                  <div className="rounded-xl border border-destructive/25 bg-destructive-surface p-3 text-xs">
                    <span className="font-semibold text-destructive">
                      Decline reason:{" "}
                    </span>
                    <span className="text-foreground">{deposit.rejectionReason}</span>
                  </div>
                )}

                {/* Action Bar — Approve + Decline on every pending request */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-3">
                  <span className="text-[0.7rem] text-muted-foreground">
                    {isActionable
                      ? hasReceipt
                        ? "Receipt submitted — ready for review."
                        : "Approve unlocks once the user uploads a receipt."
                      : ""}
                  </span>

                  {isActionable && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="accent"
                        size="sm"
                        onClick={() => setApprovingDeposit(deposit)}
                        disabled={!hasReceipt}
                        title={
                          hasReceipt
                            ? undefined
                            : "Waiting for the user to upload a receipt"
                        }
                        className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Check className="size-3.5" />
                        Approve
                      </Button>

                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setDecliningDeposit(deposit);
                          setSelectedReason(DECLINE_REASONS[0]);
                          setCustomReason("");
                        }}
                        className="gap-1.5"
                      >
                        <X className="size-3.5" />
                        Decline
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---------------------------------------------------- Receipt View Modal */}
      <AdminReceiptModal
        depositId={viewingReceipt?.depositId ?? null}
        depositReference={viewingReceipt?.reference ?? ""}
        open={Boolean(viewingReceipt)}
        onOpenChange={(open) => {
          if (!open) setViewingReceipt(null);
        }}
      />

      {/* ---------------------------------------------------- Approve Confirmation Dialog */}
      <Dialog
        open={Boolean(approvingDeposit)}
        onOpenChange={(open) => {
          if (!open && !approveLoading) setApprovingDeposit(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mb-2 grid size-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="size-5" />
            </div>
            <DialogTitle>Approve USDT Deposit</DialogTitle>
            <DialogDescription>
              Approve this deposit of{" "}
              <strong>
                {approvingDeposit
                  ? formatCurrency(approvingDeposit.amountCents)
                  : ""}{" "}
                USDT
              </strong>{" "}
              for{" "}
              <strong>
                {approvingDeposit?.userFullName ||
                  approvingDeposit?.userEmail ||
                  "the user"}
              </strong>{" "}
              and credit the user&apos;s wallet?
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-hairline bg-surface-2 p-3 text-xs leading-relaxed text-muted-foreground">
            <p className="font-semibold text-foreground">
              Server-Side Actions on Approval:
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              <li>Credits the user&apos;s available wallet balance immediately.</li>
              <li>Creates a settled transaction record on the ledger.</li>
              <li>Marks the deposit as APPROVED.</li>
              <li>Sends a confirmation notification to the user.</li>
              <li>Idempotent operation (cannot duplicate credits).</li>
            </ul>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="hairline"
              size="md"
              onClick={() => setApprovingDeposit(null)}
              disabled={approveLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="accent"
              size="md"
              onClick={handleConfirmApprove}
              disabled={approveLoading}
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              {approveLoading && <BrandedSpinner />}
              Confirm Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------------------------------------------- Decline Dialog with Required Reason */}
      <Dialog
        open={Boolean(decliningDeposit)}
        onOpenChange={(open) => {
          if (!open && !declineLoading) setDecliningDeposit(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mb-2 grid size-10 place-items-center rounded-xl bg-destructive/10 text-destructive">
              <AlertTriangle className="size-5" />
            </div>
            <DialogTitle>Decline USDT Deposit</DialogTitle>
            <DialogDescription>
              Decline this deposit request? The user&apos;s wallet will not be
              credited. A reason is required — it will be recorded and sent to
              the user with the decline.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="decline-reason" className="text-xs font-semibold">
                Select Reason
              </Label>
              <select
                id="decline-reason"
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="h-11 w-full rounded-lg border border-input bg-surface-2/70 px-3 py-2 text-xs text-foreground outline-none focus-visible:border-brand/60"
              >
                {DECLINE_REASONS.map((reason) => (
                  <option key={reason} value={reason} className="bg-surface-1 text-foreground">
                    {reason}
                  </option>
                ))}
              </select>
            </div>

            {selectedReason === "Other" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="custom-reason" className="text-xs font-semibold">
                  Custom Decline Explanation
                </Label>
                <textarea
                  id="custom-reason"
                  placeholder="Explain why this payment could not be approved..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-input bg-surface-2/70 p-3 text-xs text-foreground outline-none focus-visible:border-brand/60"
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="hairline"
              size="md"
              onClick={() => setDecliningDeposit(null)}
              disabled={declineLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="md"
              onClick={handleConfirmDecline}
              disabled={declineLoading}
            >
              {declineLoading && <BrandedSpinner />}
              Decline Deposit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

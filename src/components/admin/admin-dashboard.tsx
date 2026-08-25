"use client";

import * as React from "react";
import Link from "next/link";
import {
  Banknote,
  Clock,
  Megaphone,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

import { AdminDepositReview } from "@/components/admin/admin-deposit-review";
import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { appRoutes } from "@/config/navigation";
import { formatCurrency } from "@/lib/format";
import type { DepositRecord } from "@/types/crypto";
import type { SessionUser } from "@/types/user";

type AdminDashboardProps = {
  user: SessionUser | null;
  deposits: DepositRecord[];
};

export function AdminDashboard({ user, deposits }: AdminDashboardProps) {
  const pendingCount = deposits.filter((d) => d.status === "pending_review").length;
  const pendingVolume = deposits
    .filter((d) => d.status === "pending_review")
    .reduce((sum, d) => sum + d.amountCents, 0);

  const approvedDeposits = deposits.filter(
    (d) => d.status === "approved" || d.status === "credited"
  );
  const approvedCount = approvedDeposits.length;
  const approvedVolume = approvedDeposits.reduce(
    (sum, d) => sum + (d.creditedCents || d.amountCents),
    0
  );

  const declinedCount = deposits.filter((d) => d.status === "declined").length;

  return (
    <div className="flex flex-col gap-8">
      {/* ---------------------------------------------------- Admin Header */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <p className="eyebrow text-brand-emphasis">Platform Management</p>
            <StatusPill tone="info" dot>
              Admin Portal
            </StatusPill>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="hairline" size="sm" className="gap-1.5">
              <Link href={appRoutes.adminNotifications}>
                <Megaphone className="size-3.5" />
                Send Announcement
              </Link>
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Admin Panel
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Review and approve USDT deposit submissions, manage transactions, and broadcast announcements.
          </p>
        </div>
      </div>

      {/* ---------------------------------------------------- Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Pending Review */}
        <div className="panel-tint tint-warning flex flex-col gap-2.5 p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[0.68rem] font-semibold tracking-wider text-muted-foreground uppercase">
              Pending Review
            </span>
            <span className="tint-chip grid size-8 place-items-center rounded-lg">
              <Clock className="size-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span data-numeric className="text-3xl font-bold tracking-tight tint-ink">
              {pendingCount}
            </span>
            <span className="text-xs text-muted-foreground">
              ({formatCurrency(pendingVolume)} USDT)
            </span>
          </div>
          <p className="text-[0.7rem] text-muted-foreground">
            Awaiting verification & balance credit
          </p>
        </div>

        {/* Total Approved Volume */}
        <div className="panel-tint tint-profit flex flex-col gap-2.5 p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[0.68rem] font-semibold tracking-wider text-muted-foreground uppercase">
              Approved Volume
            </span>
            <span className="tint-chip grid size-8 place-items-center rounded-lg">
              <Banknote className="size-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span data-numeric className="text-3xl font-bold tracking-tight tint-ink">
              {formatCurrency(approvedVolume)}
            </span>
          </div>
          <p className="text-[0.7rem] text-muted-foreground">
            {approvedCount} total deposit{approvedCount === 1 ? "" : "s"} approved
          </p>
        </div>

        {/* Total Deposits */}
        <div className="panel-tint tint-neutral flex flex-col gap-2.5 p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[0.68rem] font-semibold tracking-wider text-muted-foreground uppercase">
              Total Deposits
            </span>
            <span className="tint-chip grid size-8 place-items-center rounded-lg">
              <TrendingUp className="size-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span data-numeric className="text-3xl font-bold tracking-tight text-foreground">
              {deposits.length}
            </span>
            <span className="text-xs text-muted-foreground">all-time requests</span>
          </div>
          <p className="text-[0.7rem] text-muted-foreground">
            {declinedCount} declined
          </p>
        </div>

        {/* Security & Access */}
        <div className="panel-sunken flex flex-col gap-2.5 p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[0.68rem] font-semibold tracking-wider text-muted-foreground uppercase">
              Operator Role
            </span>
            <span className="grid size-8 place-items-center rounded-lg bg-surface-2 text-brand">
              <ShieldCheck className="size-4" />
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-foreground">
              Authorized Administrator
            </span>
            <span className="truncate font-mono text-[0.68rem] text-muted-foreground">
              {user?.id}
            </span>
          </div>
          <p className="text-[0.7rem] text-emerald-400">
            Full financial approval privilege
          </p>
        </div>
      </div>

      {/* ---------------------------------------------------- Deposit Review Section */}
      <section aria-labelledby="deposits-review-heading" className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h2 id="deposits-review-heading" className="text-xl font-semibold tracking-tight sm:text-2xl">
            Deposit Requests Review
          </h2>
          <p className="text-xs text-muted-foreground">
            Examine submitted payment proofs, confirm transactions on-chain, and approve balance credits.
          </p>
        </div>

        <AdminDepositReview deposits={deposits} />
      </section>
    </div>
  );
}

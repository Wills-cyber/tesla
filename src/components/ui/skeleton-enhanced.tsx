import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Enhanced skeleton components for premium loading states.
 * Uses the CSS `.skeleton-*` classes defined in globals.css.
 */

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("skeleton-card", className)} aria-hidden="true" />
  );
}

export function SkeletonText({ className, width }: { className?: string; width?: string }) {
  return (
    <div
      className={cn("skeleton-text", className)}
      style={{ width }}
      aria-hidden="true"
    />
  );
}

export function SkeletonTitle({ className, width }: { className?: string; width?: string }) {
  return (
    <div
      className={cn("skeleton-title", className)}
      style={{ width }}
      aria-hidden="true"
    />
  );
}

export function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn("skeleton-base", className)}
      style={{ height: "100%", minHeight: "3rem" }}
      aria-hidden="true"
    />
  );
}

/**
 * Dashboard skeleton - 3 stat cards in a row
 */
export function DashboardStatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-3" aria-label="Loading dashboard stats">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex h-36 flex-col gap-3 rounded-2xl border border-hairline bg-surface-1 p-5 shadow-card">
          <div className="flex items-center justify-between">
            <div className="skeleton-text w-24" />
            <div className="size-9 rounded-xl skeleton-base" />
          </div>
          <div className="mt-auto flex flex-col gap-1.5">
            <div className="skeleton-title w-32" />
            <div className="skeleton-text w-40" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Quick actions skeleton
 */
export function QuickActionsSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-3" aria-label="Loading quick actions">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex flex-col items-center gap-3 rounded-2xl border border-hairline bg-surface-1 p-4">
          <div className="size-10 rounded-xl skeleton-base" />
          <div className="skeleton-text w-16" />
        </div>
      ))}
    </div>
  );
}

/**
 * Transaction list skeleton
 */
export function TransactionListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col divide-y divide-hairline rounded-2xl border border-hairline shadow-card" aria-label="Loading transactions">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 bg-surface-1 px-4 py-4 sm:px-5">
          <div className="size-10 shrink-0 rounded-xl skeleton-base" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="skeleton-text w-24" />
              <div className="skeleton-text w-16" />
            </div>
            <div className="skeleton-text w-48" />
          </div>
          <div className="skeleton-text w-20 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/**
 * Investment card skeleton
 */
export function InvestmentCardSkeleton() {
  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-hairline bg-surface-1 p-6 shadow-card sm:p-7">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <div className="skeleton-text w-20" />
          <div className="skeleton-title w-40" />
        </div>
        <div className="skeleton-text w-20" />
      </div>
      <div className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between">
          <div className="skeleton-text w-28" />
          <div className="skeleton-text w-12" />
        </div>
        <div className="h-2 w-full rounded-full skeleton-base" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-1">
            <div className="skeleton-text w-16" />
            <div className="skeleton-text w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Page skeleton - full page loading state
 */
export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-label="Loading page">
      <div className="flex flex-col gap-4">
        <div className="skeleton-text w-20" />
        <div className="skeleton-title w-64" />
        <div className="skeleton-text w-96" />
      </div>
      <DashboardStatsSkeleton />
      <QuickActionsSkeleton />
    </div>
  );
}
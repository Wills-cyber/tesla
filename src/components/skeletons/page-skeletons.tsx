import * as React from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Route loading skeletons.
 *
 * Each block mirrors the shape of the section it stands in for — same panel
 * radius, same grid rhythm, same rough heights — so when the data arrives the
 * page settles into place instead of jumping. Everything is an inert
 * `Skeleton` (no interactivity, no fake figures), and the global
 * `prefers-reduced-motion` rule stills the pulse.
 */

export function SkeletonPageHeader() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-2.5 w-24 rounded-full" />
        <Skeleton className="h-8 w-64 max-w-[70vw] rounded-xl" />
        <Skeleton className="h-4 w-full max-w-xl rounded-md" />
      </div>
      <Skeleton className="h-px w-full rounded-none" />
    </div>
  );
}

export function SkeletonStatCard({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "panel flex h-full w-full flex-col justify-between gap-5 rounded-2xl p-5 sm:p-6",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <Skeleton className="h-2.5 w-24 rounded-full" />
        <Skeleton className="size-9 rounded-xl" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-32 rounded-lg" />
        <Skeleton className="h-3 w-40 rounded-md" />
      </div>
    </div>
  );
}

/** Mirrors the dashboard's dominant Available Balance panel. */
export function SkeletonHeroBalance({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "panel-inverse flex w-full flex-col justify-between gap-6 rounded-2xl p-6 sm:p-7",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-2.5 w-28 rounded-full bg-white/20" />
        <Skeleton className="size-1.5 rounded-full bg-white/20" />
      </div>
      <div className="flex flex-col gap-2.5">
        <Skeleton className="h-10 w-56 max-w-full rounded-xl bg-white/20" />
        <Skeleton className="h-3 w-64 max-w-full rounded-md bg-white/15" />
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-white/12 pt-5">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-2 w-24 rounded-full bg-white/15" />
          <Skeleton className="h-5 w-20 rounded-md bg-white/20" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-2 w-24 rounded-full bg-white/15" />
          <Skeleton className="h-5 w-20 rounded-md bg-white/20" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonQuickActions() {
  return (
    <div aria-hidden="true" className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="panel flex items-center gap-3.5 rounded-2xl p-4 sm:p-5"
        >
          <Skeleton className="size-11 shrink-0 rounded-xl" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3.5 w-20 rounded-md" />
            <Skeleton className="h-3 w-28 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** One row in a transaction / notification / list panel. */
export function SkeletonListRow() {
  return (
    <div aria-hidden="true" className="flex items-center gap-4 bg-surface-1 px-4 py-4 sm:px-5">
      <Skeleton className="size-10 shrink-0 rounded-xl" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Skeleton className="h-3.5 w-36 rounded-md" />
        <Skeleton className="h-3 w-48 max-w-full rounded-md" />
      </div>
      <Skeleton className="h-4 w-20 shrink-0 rounded-md" />
    </div>
  );
}

export function SkeletonList({
  rows = 4,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex flex-col divide-y divide-hairline overflow-hidden rounded-2xl border border-hairline shadow-card",
        className
      )}
    >
      {Array.from({ length: rows }).map((_, index) => (
        <SkeletonListRow key={index} />
      ))}
    </div>
  );
}

/** A tall card — plan cards, investment cards, feature cards. */
export function SkeletonTallCard({
  withImage = false,
  className,
}: {
  withImage?: boolean;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn("panel flex flex-col overflow-hidden rounded-2xl", className)}
    >
      {withImage && <Skeleton className="aspect-video w-full rounded-none" />}
      <div className="flex flex-1 flex-col gap-4 p-5 sm:p-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-2.5 w-32 rounded-full" />
          <Skeleton className="h-5 w-44 max-w-full rounded-md" />
          <Skeleton className="h-3.5 w-full rounded-md" />
        </div>
        <Skeleton className="h-16 w-full rounded-xl" />
        <div className="flex flex-col gap-2.5">
          <Skeleton className="h-3.5 w-full rounded-md" />
          <Skeleton className="h-3.5 w-5/6 rounded-md" />
          <Skeleton className="h-3.5 w-4/6 rounded-md" />
        </div>
        <Skeleton className="mt-auto h-11 w-full rounded-lg" />
      </div>
    </div>
  );
}

/** A section heading bar with an optional trailing action. */
export function SkeletonSectionHeading({ action = false }: { action?: boolean }) {
  return (
    <div aria-hidden="true" className="flex items-end justify-between gap-4">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-40 rounded-md" />
        <Skeleton className="h-3.5 w-64 max-w-[60vw] rounded-md" />
      </div>
      {action && <Skeleton className="h-7 w-24 rounded-lg" />}
    </div>
  );
}

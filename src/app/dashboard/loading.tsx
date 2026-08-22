import { Skeleton } from "@/components/ui/skeleton";

/**
 * Dashboard loading state.
 *
 * Mirrors the real layout's spacing so the page doesn't jump when content
 * arrives. `aria-busy` plus a visually-hidden label tells assistive tech that
 * something is in flight rather than leaving it to guess at a wall of skeletons.
 */
export default function DashboardLoading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-8">
      <span className="sr-only" role="status">
        Loading your dashboard…
      </span>

      <div className="flex flex-col gap-4 border-b border-white/8 pb-8">
        <Skeleton className="h-8 w-64 rounded-lg" />
        <Skeleton className="h-4 w-full max-w-xl rounded-md" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-36 rounded-xl" />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}

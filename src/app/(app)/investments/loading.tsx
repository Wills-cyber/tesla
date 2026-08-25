import { Skeleton } from "@/components/ui/skeleton";
import {
  SkeletonPageHeader,
  SkeletonStatCard,
  SkeletonTallCard,
} from "@/components/skeletons/page-skeletons";

/**
 * Investments loading state.
 *
 * Mirrors the totals row, the tab strip and the first position card.
 */
export default function InvestmentsLoading() {
  return (
    <div role="status" aria-label="Loading investments" className="flex flex-col gap-8">
      <span className="sr-only">Loading your investments…</span>

      <SkeletonPageHeader />

      <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      <div aria-hidden="true" className="flex gap-1 rounded-xl border border-hairline bg-surface-2 p-1 self-start">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-8 w-28 rounded-lg" />
        ))}
      </div>

      <SkeletonTallCard />
    </div>
  );
}

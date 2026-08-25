import { Skeleton } from "@/components/ui/skeleton";
import {
  SkeletonList,
  SkeletonPageHeader,
} from "@/components/skeletons/page-skeletons";

/**
 * Wallet activity loading state — the back link, the filter chips and a full
 * list of rows.
 */
export default function WalletActivityLoading() {
  return (
    <div role="status" aria-label="Loading transactions" className="flex flex-col gap-8">
      <span className="sr-only">Loading your transactions…</span>

      <Skeleton aria-hidden="true" className="h-7 w-20 rounded-lg" />

      <SkeletonPageHeader />

      <div aria-hidden="true" className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="h-9 w-28 rounded-full border border-hairline bg-surface-2"
          />
        ))}
      </div>

      <SkeletonList rows={8} />
    </div>
  );
}

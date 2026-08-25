import {
  SkeletonPageHeader,
  SkeletonTallCard,
} from "@/components/skeletons/page-skeletons";

/**
 * Invest marketplace loading state.
 *
 * Mirrors the plan grid — image-led cards in the same column rhythm — so the
 * marketplace settles into place when the catalogue arrives.
 */
export default function InvestLoading() {
  return (
    <div role="status" aria-label="Loading investment plans" className="flex flex-col gap-8">
      <span className="sr-only">Loading investment plans…</span>

      <SkeletonPageHeader />

      <div aria-hidden="true" className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonTallCard key={index} withImage />
        ))}
      </div>
    </div>
  );
}

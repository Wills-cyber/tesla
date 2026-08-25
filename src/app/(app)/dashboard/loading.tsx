import {
  SkeletonHeroBalance,
  SkeletonList,
  SkeletonPageHeader,
  SkeletonQuickActions,
  SkeletonSectionHeading,
  SkeletonStatCard,
  SkeletonTallCard,
} from "@/components/skeletons/page-skeletons";

/**
 * Dashboard loading state.
 *
 * Mirrors the real layout — header, balance row, quick actions, investments,
 * recent activity — so the page settles into place when the ledger data
 * arrives instead of jumping.
 */
export default function DashboardLoading() {
  return (
    <div role="status" aria-label="Loading dashboard" className="flex flex-col gap-8">
      <span className="sr-only">Loading your dashboard…</span>

      <SkeletonPageHeader />

      <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SkeletonHeroBalance className="sm:col-span-2 xl:col-span-2" />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard className="sm:col-span-2 xl:col-span-1" />
      </div>

      <section aria-hidden="true" className="flex flex-col gap-4">
        <SkeletonSectionHeading />
        <SkeletonQuickActions />
      </section>

      <section aria-hidden="true" className="flex flex-col gap-4">
        <SkeletonSectionHeading action />
        <div className="grid gap-4 lg:grid-cols-2">
          <SkeletonTallCard />
          <SkeletonTallCard />
        </div>
      </section>

      <section aria-hidden="true" className="flex flex-col gap-4">
        <SkeletonSectionHeading action />
        <SkeletonList rows={4} />
      </section>
    </div>
  );
}

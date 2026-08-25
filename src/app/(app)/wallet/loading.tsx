import {
  SkeletonHeroBalance,
  SkeletonList,
  SkeletonPageHeader,
  SkeletonSectionHeading,
  SkeletonTallCard,
} from "@/components/skeletons/page-skeletons";

/**
 * Wallet loading state.
 *
 * Mirrors the balance hero, the withdrawal history and the recent activity
 * list, so the financial surface holds its shape while the ledger loads.
 */
export default function WalletLoading() {
  return (
    <div role="status" aria-label="Loading wallet" className="flex flex-col gap-8">
      <span className="sr-only">Loading your wallet…</span>

      <SkeletonPageHeader />

      <SkeletonHeroBalance />

      <section aria-hidden="true" className="flex flex-col gap-4">
        <SkeletonSectionHeading action />
        <SkeletonList rows={3} />
      </section>

      <section aria-hidden="true" className="flex flex-col gap-4">
        <SkeletonSectionHeading action />
        <SkeletonList rows={4} />
      </section>

      <section aria-hidden="true" className="flex flex-col gap-5">
        <SkeletonSectionHeading />
        <div className="grid gap-4 lg:grid-cols-2">
          <SkeletonTallCard />
          <SkeletonTallCard />
        </div>
      </section>
    </div>
  );
}

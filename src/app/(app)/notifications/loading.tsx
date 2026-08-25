import {
  SkeletonList,
  SkeletonPageHeader,
} from "@/components/skeletons/page-skeletons";

/**
 * Notifications loading state — the header, then a feed of rows.
 */
export default function NotificationsLoading() {
  return (
    <div role="status" aria-label="Loading notifications" className="flex flex-col gap-8">
      <span className="sr-only">Loading your notifications…</span>

      <SkeletonPageHeader />

      <SkeletonList rows={6} />
    </div>
  );
}

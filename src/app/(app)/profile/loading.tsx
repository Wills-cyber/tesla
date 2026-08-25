import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonPageHeader } from "@/components/skeletons/page-skeletons";

/**
 * Profile loading state — the two-column grid of setting panels.
 */
export default function ProfileLoading() {
  return (
    <div role="status" aria-label="Loading profile" className="flex flex-col gap-8">
      <span className="sr-only">Loading your profile…</span>

      <SkeletonPageHeader />

      <div aria-hidden="true" className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] xl:items-start">
        <div className="flex flex-col gap-6">
          <SkeletonPanel rows={5} />
          <SkeletonPanel rows={3} />
        </div>
        <div className="flex flex-col gap-6">
          <SkeletonPanel rows={4} />
          <SkeletonPanel rows={2} />
          <SkeletonPanel rows={2} />
        </div>
      </div>
    </div>
  );
}

function SkeletonPanel({ rows }: { rows: number }) {
  return (
    <div className="panel flex flex-col gap-5 rounded-2xl p-6 sm:p-7">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 shrink-0 rounded-xl" />
        <Skeleton className="h-5 w-40 rounded-md" />
      </div>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex flex-col gap-2 border-t border-hairline pt-4">
          <Skeleton className="h-3.5 w-28 rounded-md" />
          <Skeleton className="h-3 w-full max-w-md rounded-md" />
        </div>
      ))}
    </div>
  );
}

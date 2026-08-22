import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { getAccountMode, getAccountUser, isPreviewMode } from "@/lib/auth/session";
import { getUnreadNotificationCount, resolveOrEmpty } from "@/lib/data";

/**
 * Authenticated dashboard shell.
 *
 * The account is resolved once here and the result flows down through props, so
 * child pages don't each re-derive who is signed in.
 *
 * Access control lives in three places, deliberately: `src/proxy.ts` performs an
 * optimistic redirect, `getAccountMode()` verifies the session with the auth
 * server, and Row Level Security is the final backstop on every table. While
 * Supabase is unconfigured, `getAccountMode()` reports `preview` and the shell
 * renders with a visible "backend not connected" label.
 */
export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const account = await getAccountMode();
  const user = getAccountUser(account);
  const preview = isPreviewMode(account);

  const { data: unreadCount } = resolveOrEmpty(
    await getUnreadNotificationCount(),
    0
  );

  return (
    <div className="flex min-h-dvh w-full">
      <DashboardSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader
          user={user}
          preview={preview}
          unreadCount={unreadCount}
        />

        <main
          id="main-content"
          className="flex flex-1 flex-col gap-8 px-5 py-8 md:px-8 md:py-10 xl:px-10"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

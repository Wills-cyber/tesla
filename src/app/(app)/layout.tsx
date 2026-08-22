import { AppTopBar } from "@/components/navigation/app-top-bar";
import { BottomNavigation } from "@/components/navigation/bottom-navigation";
import { getAccountMode, getAccountUser, isPreviewMode } from "@/lib/auth/session";
import { getUnreadNotificationCount, resolveOrEmpty } from "@/lib/data";

/**
 * Authenticated application shell.
 *
 * There is no sidebar. Navigation is a single floating bottom bar shared by every
 * breakpoint — phone, tablet and desktop — so there is exactly one mental model
 * for moving around the product. `main` carries `.pb-bottom-nav`, whose clearance
 * token guarantees the bar never covers page content or a page's last action.
 *
 * The account is resolved once here and flows down through props, so child pages
 * don't each re-derive who is signed in.
 *
 * Access control lives in three places, deliberately: `src/proxy.ts` performs an
 * optimistic redirect, `getAccountMode()` verifies the session with the auth
 * server, and Row Level Security is the final backstop on every table. While
 * Supabase is unconfigured, `getAccountMode()` reports `preview` and the shell
 * renders with a visible "backend not connected" label.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const account = await getAccountMode();
  const user = getAccountUser(account);
  const preview = isPreviewMode(account);

  const { data: unreadCount } = resolveOrEmpty(
    await getUnreadNotificationCount(),
    0
  );

  return (
    <div className="flex min-h-dvh w-full flex-col">
      <AppTopBar user={user} preview={preview} unreadCount={unreadCount} />

      <main
        id="main-content"
        className="container-app pb-bottom-nav flex flex-1 flex-col gap-8 pt-7 md:gap-10 md:pt-9"
      >
        {children}
      </main>

      <BottomNavigation />
    </div>
  );
}

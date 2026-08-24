import { AppTopBar } from "@/components/navigation/app-top-bar";
import { BottomNavigation } from "@/components/navigation/bottom-navigation";
import { RealtimeRefresh } from "@/components/providers/realtime-refresh";
import { AppVehicleBackdrop } from "@/components/vehicles/app-vehicle-backdrop";
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
 *
 * ---------------------------------------------------------------------------
 * Layering
 * ---------------------------------------------------------------------------
 * `isolate` makes this shell the stacking context for the whole app, which is
 * what lets the vehicle backdrop sit at `z-0` and everything else stack above it
 * predictably:
 *
 *   backdrop (0) → page content (10) → top bar (40) → bottom nav (50)
 *
 * Dialogs and toasts portal to `<body>`, so they land outside this context and
 * stay on top of all of it. The backdrop is mounted once here rather than per
 * page: a fixed layer costs nothing to keep across route changes, and the
 * animation stays defined in exactly one place.
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
    <div className="relative isolate flex min-h-dvh w-full flex-col">
      <AppVehicleBackdrop />

      <AppTopBar user={user} preview={preview} unreadCount={unreadCount} />

      <main
        id="main-content"
        className="container-app pb-bottom-nav relative z-10 flex flex-1 flex-col gap-8 pt-7 md:gap-10 md:pt-9"
      >
        {children}
      </main>

      {/* Keeps notification and withdrawal state current without a manual reload.
          Only mounted for a real signed-in account — there is nothing to subscribe
          to in preview mode. */}
      {user ? <RealtimeRefresh userId={user.id} /> : null}

      <BottomNavigation />
    </div>
  );
}

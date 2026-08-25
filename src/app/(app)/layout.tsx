import { AppTopBar } from "@/components/navigation/app-top-bar";
import { BottomNavigation } from "@/components/navigation/bottom-navigation";
import { PageEnter } from "@/components/common/page-enter";
import { NotificationsProvider } from "@/components/notifications/notifications-provider";
import { RealtimeRefresh } from "@/components/providers/realtime-refresh";
import { AppVehicleBackdrop } from "@/components/vehicles/app-vehicle-backdrop";
import { getAccountMode, getAccountUser, isPreviewMode } from "@/lib/auth/session";
import { getIsAdmin, getUnreadNotificationCount, resolveOrEmpty } from "@/lib/data";

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
 * The notification provider is mounted here — once per authenticated shell — so
 * there is exactly one realtime subscription for the signed-in user, the bell
 * badge and the dropdown reflect it, and unmounting on sign-out tears the
 * subscription down.
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

  const [unreadResult, adminResult] = await Promise.all([
    getUnreadNotificationCount(),
    getIsAdmin(),
  ]);

  // Both degrade to the safe default: an honest zero badge before Supabase is
  // connected, and "not an admin" for anyone without a row in `admins`.
  const { data: unreadCount } = resolveOrEmpty(unreadResult, 0);
  const { data: isAdmin } = resolveOrEmpty(adminResult, false);

  return (
    <div className="relative isolate flex min-h-dvh w-full flex-col">
      <AppVehicleBackdrop />

      <NotificationsProvider
        userId={user?.id ?? null}
        initialUnreadCount={unreadCount}
      >
        <AppTopBar user={user} preview={preview} isAdmin={isAdmin} />

        {/* `PageEnter` renders the `<main>` itself so the shell's layout is
            unchanged, and re-keys it per route so each page's sections animate in
            on every navigation rather than only on first paint. */}
        <PageEnter
          as="main"
          id="main-content"
          className="container-app pb-bottom-nav relative z-10 flex flex-1 flex-col gap-8 pt-7 md:gap-10 md:pt-9"
        >
          {children}
        </PageEnter>
      </NotificationsProvider>

      {/* Keeps withdrawal state current without a manual reload. Notification
          state is owned by the provider above; this component now covers only
          `withdrawal_requests`, so nothing opens two subscriptions for the same
          table. Only mounted for a real signed-in account — there is nothing to
          subscribe to in preview mode. */}
      {user ? <RealtimeRefresh userId={user.id} /> : null}

      <BottomNavigation />
    </div>
  );
}

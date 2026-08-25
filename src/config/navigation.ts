import type { LucideIcon } from "lucide-react";
import {
  Bell,
  LayoutDashboard,
  Sparkles,
  TrendingUp,
  UserRound,
  Wallet,
} from "lucide-react";

/* ------------------------------------------------------------------ Routes */

/**
 * Every in-app destination, in one place.
 *
 * Pages and components import from here rather than writing string literals, so
 * a route rename is a single edit and a typo is a type error.
 */
export const appRoutes = {
  dashboard: "/dashboard",
  invest: "/invest",
  planDetail: (slug: string) => `/invest/${slug}`,
  investments: "/investments",
  wallet: "/wallet",
  walletActivity: "/wallet/activity",
  /** The multi-step USDT deposit flow. */
  deposit: "/wallet/deposit",
  /** A single deposit request's payment screen and status. */
  depositDetail: (id: string) => `/wallet/deposit/${id}`,
  /** The multi-step withdrawal flow. A page, not a modal — see the route file. */
  withdraw: "/wallet/withdraw",
  /** A single withdrawal request's status. Addressable, so it can be shared. */
  withdrawalDetail: (id: string) => `/wallet/withdraw/${id}`,
  profile: "/profile",
  notifications: "/notifications",
  /** Admin portal dashboard. */
  admin: "/admin",
  /** Admin deposit review and approval surface. */
  adminDeposits: "/admin/deposits",
  /** Admin-only broadcast surface. The page re-checks the `admins` table. */
  adminNotifications: "/admin/notifications",
} as const;

export const legalRoutes = {
  terms: "/terms",
  privacy: "/privacy",
} as const;

export const authRoutes = {
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  afterLogin: appRoutes.dashboard,
  afterLogout: "/",
} as const;

/* ---------------------------------------------------------- Marketing site */

export type MarketingNavItem = {
  label: string;
  /** Either a route or an in-page anchor on the landing page. */
  href: string;
  /** Anchors are resolved against `/` so they work from any route. */
  isAnchor?: boolean;
};

export const marketingNav: readonly MarketingNavItem[] = [
  { label: "Home", href: "/" },
  { label: "Investment Plans", href: "#investment-plans", isAnchor: true },
  { label: "How It Works", href: "#how-it-works", isAnchor: true },
  { label: "About", href: "#about", isAnchor: true },
  { label: "FAQ", href: "#faq", isAnchor: true },
] as const;

/* ------------------------------------------------------ Application shell */

export type PrimaryNavItem = {
  label: string;
  /** Even shorter label for the bottom bar on narrow phones. */
  shortLabel: string;
  href: string;
  icon: LucideIcon;
  /** One line describing the area's purpose. Used in menus and aria labels. */
  purpose: string;
};

/**
 * The five primary areas of the application.
 *
 * This *is* the navigation — there is no sidebar and no secondary rail. Five
 * items is the practical ceiling for a bottom bar on a phone, so anything that
 * isn't one of these five lives inside one of them:
 *
 *   · Deposit / Withdraw / transaction history → Wallet
 *   · Plan browsing and plan detail            → Invest
 *   · Notifications, security, appearance      → Profile (and the top bar)
 */
export const primaryNav: readonly PrimaryNavItem[] = [
  {
    label: "Dashboard",
    shortLabel: "Home",
    href: appRoutes.dashboard,
    icon: LayoutDashboard,
    purpose: "Your starting point — how the platform works and what to do next",
  },
  {
    label: "Invest",
    shortLabel: "Invest",
    href: appRoutes.invest,
    icon: Sparkles,
    purpose: "Browse every available investment plan",
  },
  {
    label: "Investments",
    shortLabel: "Mine",
    href: appRoutes.investments,
    icon: TrendingUp,
    purpose: "Track the investments you actually hold",
  },
  {
    label: "Wallet",
    shortLabel: "Wallet",
    href: appRoutes.wallet,
    icon: Wallet,
    purpose: "Balance, deposits, withdrawals and account activity",
  },
  {
    label: "Profile",
    shortLabel: "Profile",
    href: appRoutes.profile,
    icon: UserRound,
    purpose: "Account details, security and preferences",
  },
] as const;

/** Reachable from the top bar and Profile, deliberately not from the bottom bar. */
export const utilityNav = [
  {
    label: "Notifications",
    href: appRoutes.notifications,
    icon: Bell,
    purpose: "Account and platform updates",
  },
] as const;

/**
 * Resolves the active primary area for a pathname.
 *
 * `/dashboard` is matched exactly — a prefix check would light up Dashboard on
 * every route if the dashboard ever gained children. Everything else matches on
 * its prefix so `/invest/vehicle-investment` keeps Invest active.
 */
export function getActivePrimaryHref(pathname: string): string | null {
  const match = primaryNav.find((item) =>
    item.href === appRoutes.dashboard
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(`${item.href}/`)
  );
  return match?.href ?? null;
}

/* ------------------------------------------------------------------ Footer */

export const footerNav = {
  navigation: {
    title: "Navigation",
    items: [
      { label: "Investment Plans", href: "/#investment-plans" },
      { label: "How It Works", href: "/#how-it-works" },
      { label: "About", href: "/#about" },
      { label: "FAQ", href: "/#faq" },
    ],
  },
  account: {
    title: "Account",
    items: [
      { label: "Login", href: authRoutes.login },
      { label: "Register", href: authRoutes.register },
    ],
  },
  legal: {
    title: "Legal",
    items: [
      { label: "Terms", href: legalRoutes.terms },
      { label: "Privacy", href: legalRoutes.privacy },
    ],
  },
} as const;

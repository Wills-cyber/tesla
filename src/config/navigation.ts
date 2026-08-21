import type { LucideIcon } from "lucide-react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Bell,
  LayoutDashboard,
  Receipt,
  TrendingUp,
  UserRound,
} from "lucide-react";

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

export type DashboardNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
  /** Rendered with a "Soon" affordance and no live functionality. */
  comingSoon?: boolean;
};

export const dashboardNav: readonly DashboardNavItem[] = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Account summary",
  },
  {
    label: "Investments",
    href: "/dashboard/investments",
    icon: TrendingUp,
    description: "Plans and active positions",
  },
  {
    label: "Transactions",
    href: "/dashboard/transactions",
    icon: Receipt,
    description: "Account history",
  },
  {
    label: "Notifications",
    href: "/dashboard/notifications",
    icon: Bell,
    description: "Platform updates",
  },
  {
    label: "Profile",
    href: "/dashboard/profile",
    icon: UserRound,
    description: "Account and security",
  },
] as const;

export const dashboardSecondaryNav: readonly DashboardNavItem[] = [
  {
    label: "Deposit",
    href: "/dashboard/deposit",
    icon: ArrowDownToLine,
    description: "Fund your account",
    comingSoon: true,
  },
  {
    label: "Withdraw",
    href: "/dashboard/withdraw",
    icon: ArrowUpFromLine,
    description: "Request a payout",
    comingSoon: true,
  },
] as const;

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
      { label: "Login", href: "/login" },
      { label: "Register", href: "/register" },
    ],
  },
  legal: {
    title: "Legal",
    items: [
      { label: "Terms", href: "/terms" },
      { label: "Privacy", href: "/privacy" },
      { label: "Risk Disclosure", href: "/risk-disclosure" },
    ],
  },
} as const;

export const authRoutes = {
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  afterLogin: "/dashboard",
  afterLogout: "/",
} as const;

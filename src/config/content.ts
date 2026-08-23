import type { LucideIcon } from "lucide-react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Banknote,
  BarChart3,
  CalendarClock,
  ClipboardList,
  Compass,
  Gem,
  LineChart,
  Radar,
  Rocket,
  ShieldCheck,
  UserPlus,
  Wallet,
} from "lucide-react";

/* ---------------------------------------------------------------- How it works */

export type ProcessStep = {
  number: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Rendered with a muted "not yet available" treatment. */
  pending?: boolean;
  pendingLabel?: string;
};

export const processSteps: readonly ProcessStep[] = [
  {
    number: "01",
    title: "Create Your Account",
    description:
      "Register with your name and email address. Account creation is free and takes under a minute.",
    icon: UserPlus,
  },
  {
    number: "02",
    title: "Choose an Investment Plan",
    description:
      "Review the stated terms of each fixed-term plan — capital required, duration, payment periods and completion amount.",
    icon: Compass,
  },
  {
    number: "03",
    title: "Activate Your Investment",
    description:
      "Choose a plan, review its full stated terms and confirm. Activation debits your available balance and creates the investment immediately.",
    icon: Wallet,
  },
  {
    number: "04",
    title: "Track Your Investment",
    description:
      "Follow every payment period from your dashboard, with a full record of activity on your account.",
    icon: LineChart,
  },
] as const;

/* -------------------------------------------------------- Why TESLA Electronics */

export type FeatureItem = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export const platformFeatures: readonly FeatureItem[] = [
  {
    title: "Future Focused",
    description:
      "Built around electric mobility and the technology moving it forward, rather than short-horizon speculation.",
    icon: Rocket,
  },
  {
    title: "Long-Term Approach",
    description:
      "Fixed-term plans with clearly stated durations and payment schedules, published before you commit anything.",
    icon: BarChart3,
  },
  {
    title: "Transparent Tracking",
    description:
      "Every plan term, payment period and account event is visible in your dashboard. Nothing is implied or estimated.",
    icon: Radar,
  },
  {
    title: "Premium Experience",
    description:
      "A considered interface across desktop, tablet and mobile — fast, accessible and free of clutter.",
    icon: Gem,
  },
] as const;

/* ------------------------------------------------------------------ Statistics */

export type PlatformStat = {
  value: string;
  label: string;
  detail: string;
};

/**
 * Product facts only.
 *
 * These describe how the platform is configured. There are deliberately no
 * investor counts, capital totals, payout figures or success rates here —
 * the platform is pre-launch and has none of those to report.
 */
export const platformStats: readonly PlatformStat[] = [
  {
    value: "30 Days",
    label: "Example Plan Duration",
    detail: "Term length of the published Vehicle Investment plan.",
  },
  {
    value: "4",
    label: "Weekly Payment Periods",
    detail: "Scheduled payment periods across the plan term.",
  },
  {
    value: "24/7",
    label: "Dashboard Access",
    detail: "Your account and plan terms are available at any time.",
  },
  {
    value: "3–4 Days",
    label: "Withdrawal Settlement",
    detail: "Withdrawal requests are reviewed and settled manually.",
  },
] as const;

/* ------------------------------------------------------------------------ FAQ */

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

export const faqs: readonly FaqItem[] = [
  {
    id: "what-is-tesla-electronics",
    question: "What is TESLA Electronics?",
    answer:
      "TESLA Electronics is an independent platform concept for fixed-term investment plans modelled around electric vehicles, mobility and related technology. It is currently a pre-launch product: you can create an account and review published plan terms, but no capital is accepted and no investment activity takes place. TESLA Electronics is not affiliated with, endorsed by, or sponsored by Tesla, Inc.",
  },
  {
    id: "how-do-plans-work",
    question: "How do the investment plans work?",
    answer:
      "Each plan publishes its full terms up front: the capital required to enter, the term length, how many payment periods the term is divided into, the stated profit per period, and the completion amount at the end of the term. Those figures describe what a plan proposes. They are not a record of money received or paid, and none of them are active while the platform is pre-launch.",
  },
  {
    id: "how-long-does-a-plan-last",
    question: "How long does a plan last?",
    answer:
      "The published Vehicle Investment plan has a stated term of 30 days, divided into 4 weekly payment periods. Future plans may use different durations, and each will state its own term before it becomes available.",
  },
  {
    id: "example-investment-amount",
    question: "How much is the example investment?",
    answer:
      "The Vehicle Investment plan states an entry amount of $1,000 with a principal of $1,000 returned at the end of the term. This is a published example of plan terms. No deposit can currently be made against it.",
  },
  {
    id: "when-deposits",
    question: "When will deposits become available?",
    answer:
      "Deposits are not enabled. They will open only once payment processing, account verification and the required compliance review are complete. We have not announced a date, and we would rather leave the feature switched off than take funds through an unfinished system.",
  },
  {
    id: "when-withdrawals",
    question: "When will withdrawals become available?",
    answer:
      "Withdrawals are not enabled and will follow the same schedule as deposits. Because no funds are held on the platform today, there is nothing to withdraw. Any change to this will be announced in your dashboard notifications.",
  },
  {
    id: "what-do-the-figures-mean",
    question: "What do the figures on each plan mean?",
    answer:
      "They are stated terms — what the plan proposes to pay if it performs as described. They are not a record of money received or paid, and none of them are active while the platform is pre-launch. Nothing on this site is financial, investment, tax or legal advice. Consider taking independent professional advice before making any financial decision.",
  },
] as const;

/* ---------------------------------------------------------------------- About */

export const aboutContent = {
  eyebrow: "About",
  heading: "Built for the transition to electric mobility",
  body: [
    "TESLA Electronics is an independent platform being built around a simple idea: the shift to electric vehicles is a long-term structural change, and the products built around it should be structured for the long term too.",
    "The platform is in pre-launch. What exists today is the product itself — published plan terms, an account system and a dashboard designed to show you exactly where an investment stands at every payment period. What does not exist yet is any movement of money, and we are not pretending otherwise.",
    "When deposits open, they will open because the payment, verification and compliance work behind them is finished — not because a launch date needed hitting.",
  ],
  principles: [
    {
      title: "Stated terms, not projections",
      description:
        "Every figure on a plan is a published term. We do not display estimated returns or simulated performance.",
      icon: ShieldCheck,
    },
    {
      title: "No activity we haven't had",
      description:
        "Your dashboard shows zero balances and empty histories because that is genuinely the state of a pre-launch account.",
      icon: Radar,
    },
  ],
} as const;

/* ------------------------------------------------- Dashboard: guided onboarding */

/**
 * The "Start Here" path shown on the dashboard.
 *
 * Five ordered steps, each pointing at a real route. `href` values are literals
 * here rather than imports from `src/config/navigation.ts` to keep this module
 * free of dependencies — the dashboard page maps them through `appRoutes` and a
 * mismatch would fail to compile there.
 */
export type GuideStepContent = {
  title: string;
  description: string;
  icon: LucideIcon;
  actionLabel: string;
  /** Key into `appRoutes`, resolved by the dashboard page. */
  route: "invest" | "investments" | "wallet";
  note?: string;
};

export const dashboardGuideSteps: readonly GuideStepContent[] = [
  {
    title: "Explore Investment Plans",
    description:
      "Every published plan lists its full terms up front: the capital required, the term length, how many payment periods it runs for, and the completion amount.",
    icon: Compass,
    actionLabel: "Explore Plans",
    route: "invest",
  },
  {
    title: "Choose an Investment",
    description:
      "Open a plan to see its payment schedule period by period, then decide whether the term and the stated figures suit you.",
    icon: ClipboardList,
    actionLabel: "Compare Plans",
    route: "invest",
  },
  {
    title: "Fund Your Wallet",
    description:
      "Deposits and withdrawals both live in your Wallet. A plan can only be activated once the required funds are actually available in your balance.",
    icon: Wallet,
    actionLabel: "Open Wallet",
    route: "wallet",
    note: "Deposits are not enabled yet — no payment provider is connected.",
  },
  {
    title: "Activate Your Investment",
    description:
      "Activation moves capital from your wallet balance into the plan and creates the payment schedule against your account.",
    icon: Rocket,
    actionLabel: "View Plans",
    route: "invest",
    note: "Requires an available balance, so this step is not yet reachable.",
  },
  {
    title: "Track Your Investment",
    description:
      "Follow each payment period, the days remaining and the profit actually credited. Your Investments tab shows only what your account really holds.",
    icon: LineChart,
    actionLabel: "View Investments",
    route: "investments",
  },
] as const;

/* --------------------------------------------- Dashboard: how the platform works */

export type ExplainerContent = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  points?: readonly string[];
};

/**
 * The educational content on the dashboard.
 *
 * Describes mechanics only — how a plan is structured, how a period is paid, how a
 * deposit is credited. There are deliberately no claims about company performance,
 * investor numbers, capital under management, regulatory status, partnerships or
 * profits paid, because the platform is pre-launch and has none of those to report.
 */
export const platformExplainers: readonly ExplainerContent[] = [
  {
    id: "how-it-works",
    title: "How the platform works",
    description:
      "TESLA Electronics publishes fixed-term investment plans modelled around electric vehicles and mobility technology. You review the terms, fund your wallet, activate a plan, and follow it through to completion from your dashboard.",
    icon: Compass,
    points: [
      "Plan terms are published before you commit anything",
      "Your wallet is the single place money enters or leaves",
      "Your dashboard shows only your own account's real activity",
    ],
  },
  {
    id: "plan-structure",
    title: "How investment plans are structured",
    description:
      "Every plan states five things: the capital required to enter, the term length in days, the number of payment periods, the stated profit per period, and the completion amount at the end of the term.",
    icon: ClipboardList,
    points: [
      "Completion amount = principal + total stated profit",
      "Total stated profit = stated profit per period x number of periods",
      "The database rejects any plan whose figures do not add up",
    ],
  },
  {
    id: "weekly-payments",
    title: "How weekly profit payments work",
    description:
      "A plan's term is divided into scheduled payment periods, one per week. Each period has its own due date and amount, and is marked paid only once the payment has actually been recorded against your account.",
    icon: Banknote,
    points: [
      "A period shows as paid because a payment record exists, never because time passed",
      "Profit credited to your wallet is money you can withdraw or reinvest",
      "Your investment page shows every period, paid or scheduled",
    ],
  },
  {
    id: "duration",
    title: "How investment duration works",
    description:
      "The term runs from the day the investment is activated to its maturity date. Days remaining is counted from the maturity date on your investment record, not estimated.",
    icon: CalendarClock,
    points: [
      "The term starts at activation, not at the moment you choose a plan",
      "The principal is returned at the end of the term",
      "A plan cannot be active without a recorded start date",
    ],
  },
  {
    id: "monitoring",
    title: "How to monitor an investment",
    description:
      "The Investments tab groups your positions into active, pending and completed, and shows the progress of each one: payments received, payments remaining, days left and profit credited to date.",
    icon: LineChart,
    points: [
      "Progress is measured by payments actually received",
      "Profit credited is read from the ledger, never projected",
      "Every credit also appears in your wallet activity",
    ],
  },
] as const;

/** Wallet mechanics, kept separate so the Wallet page can reuse them. */
export const walletExplainers: readonly ExplainerContent[] = [
  {
    id: "deposits",
    title: "How wallet deposits work",
    description:
      "Deposits are made in crypto. You choose an asset and the exact network you will send from, and the platform issues a deposit address for that specific pair. Funds are credited once the network confirms the transaction.",
    icon: ArrowDownToLine,
    points: [
      "An asset does not exist on every blockchain — always match the network",
      "Sending the wrong asset or using the wrong network can permanently lose funds",
      "Your balance changes only when a confirmed deposit is recorded",
    ],
  },
  {
    id: "withdrawals",
    title: "How withdrawals work",
    description:
      "You request a withdrawal from your available balance, choosing the asset, the network and your own destination wallet address. The request is checked and processed server-side, then broadcast by the payment infrastructure.",
    icon: ArrowUpFromLine,
    points: [
      "Minimum withdrawal is $500 USD equivalent, enforced on the server",
      "The crypto amount comes from a live exchange-rate quote, never a fixed rate",
      "You confirm the address and network on a dedicated review step before submitting",
    ],
  },
] as const;

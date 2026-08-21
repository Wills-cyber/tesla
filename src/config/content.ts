import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
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
      "Funding is not yet available. Deposits will open once payment processing and compliance review are complete.",
    icon: Wallet,
    pending: true,
    pendingLabel: "Deposits Coming Soon",
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
    value: "Coming Soon",
    label: "Deposits & Withdrawals",
    detail: "Funding and payouts are not yet enabled on the platform.",
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
    id: "are-returns-guaranteed",
    question: "Are investment returns guaranteed?",
    answer:
      "No. The figures shown on each plan are stated terms — what the plan proposes to pay if it performs as described. They are not a guarantee, a warranty, or a promise of profit, and they are not protected by any deposit insurance or investor compensation scheme. Investing carries risk, including the risk of losing some or all of the capital you commit. Nothing on this site is financial, investment, tax or legal advice. Consider taking independent professional advice before making any financial decision. See our Risk Disclosure for the full statement.",
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

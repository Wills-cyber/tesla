/**
 * Single source of truth for brand-level strings and public URLs.
 *
 * TESLA Electronics is an independent pre-launch platform concept. It is not
 * affiliated with, endorsed by, or sponsored by Tesla, Inc. Vehicle names used
 * anywhere in this product are referenced descriptively as market categories.
 */
export const siteConfig = {
  name: "TESLA Electronics",
  shortName: "TESLA Electronics",
  tagline: "Invest in the Future of Mobility",
  description:
    "Explore long-term investment opportunities built around the future of electric vehicles, mobility and innovative technology.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  locale: "en_US",
  contactEmail: "support@tesla-electronics.example",
  copyright: "© 2026 TESLA Electronics. All rights reserved.",
  affiliationDisclaimer:
    "TESLA Electronics is an independent platform and is not affiliated with, endorsed by, or sponsored by Tesla, Inc. Vehicle model names are referenced only to describe electric vehicle categories.",
  prelaunchNotice:
    "Investment activation and withdrawal requests are live. Deposits are not yet available, and withdrawals are settled manually within 3–4 working days.",
} as const;

/**
 * Product stage flags.
 *
 * Investment activation and withdrawal *requests* are live. Deposits are not:
 * crediting a balance requires a payment provider to confirm funds arrived, and
 * none is connected, so `depositsEnabled` stays false rather than showing an
 * address nothing watches.
 *
 * `withdrawalsEnabled` means a user may submit a request that is recorded as
 * `pending`. It does not mean the platform can send crypto — see
 * `supabase/migrations/0006_go_live_investments_and_withdrawals.sql`. The
 * authoritative switch is the `withdrawals_enabled` row in `platform_settings`,
 * which `request_withdrawal` reads inside Postgres; this flag only decides what
 * the UI offers.
 */
export const featureFlags = {
  depositsEnabled: false,
  withdrawalsEnabled: true,
  investmentActivationEnabled: true,
  liveMarketData: false,
  /**
   * Whether `public/images/investments/` still holds generated placeholders.
   *
   * `false` since the real PNG artwork landed. While it was `true`, `PlanImage`
   * captioned every frame with the vehicle name and "Artwork coming soon" so an
   * empty gradient did not read as a broken image — that caption would now be
   * graffiti across real artwork, which is why this flag exists and why it is off.
   *
   * Set it back to `true` only if the files are ever removed or reverted to
   * placeholders.
   */
  planArtworkIsPlaceholder: false,
} as const;

export type SiteConfig = typeof siteConfig;
export type FeatureFlags = typeof featureFlags;

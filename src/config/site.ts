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
    "TESLA Electronics is a pre-launch product. Deposits, withdrawals and live investment activity are not yet available.",
} as const;

/**
 * Product stage flags. Everything money-related stays off until the backend,
 * payment provider and compliance review are actually in place.
 */
export const featureFlags = {
  depositsEnabled: false,
  withdrawalsEnabled: false,
  investmentActivationEnabled: false,
  liveMarketData: false,
  /**
   * The files in `public/images/investments/` are still generated placeholders —
   * a soft gradient wash with no vehicle in it and no lettering.
   *
   * While this is `true`, `PlanImage` captions the frame with the vehicle name, so
   * a plan card reads as "artwork pending for the Model 3" instead of as an empty
   * panel. Set it to `false` the moment real photography is dropped in and the
   * captions disappear — the image paths do not change, so that flag is the only
   * edit required.
   */
  planArtworkIsPlaceholder: true,
} as const;

export type SiteConfig = typeof siteConfig;
export type FeatureFlags = typeof featureFlags;

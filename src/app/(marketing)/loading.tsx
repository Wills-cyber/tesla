import { BrandedLoaderScreen } from "@/components/brand/branded-loader";

/**
 * Marketing loading state.
 *
 * These pages are largely static, so this rarely appears — but when it does the
 * brand mark is what shows, not a bare spinner, which keeps the loading language
 * identical from the landing page through to the dashboard.
 */
export default function MarketingLoading() {
  return <BrandedLoaderScreen label="Loading" />;
}

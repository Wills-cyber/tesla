import { BrandedLoaderScreen } from "@/components/brand/branded-loader";

/**
 * Application loading state.
 *
 * Shared by every route in the shell. The branded loader — the mark tracing
 * itself in under an orbiting progress ring — is the app's single loading
 * language, so a route transition looks like the product rather than like a
 * generic spinner.
 */
export default function AppLoading() {
  return <BrandedLoaderScreen label="Loading" />;
}

import { BrandedLoaderScreen } from "@/components/brand/branded-loader";

/**
 * Withdrawal flow loading state.
 *
 * The route resolves the supported pairs, the policy and the balance before it can
 * render anything, so the branded loader carries a label naming what is happening
 * rather than a bare spinner. Same visual language as every other route boundary
 * in the app.
 */
export default function WithdrawLoading() {
  return <BrandedLoaderScreen label="Preparing withdrawal" />;
}

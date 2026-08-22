import { BrandedLoaderScreen } from "@/components/brand/branded-loader";

/**
 * Auth loading state.
 *
 * Covers the moment between requesting `/login`, `/register` or
 * `/forgot-password` and the form being ready — including the session check the
 * proxy performs, which is when a signed-in visitor is redirected away. Same
 * branded loader as the rest of the app, so the transition into the product is one
 * continuous piece of motion rather than two unrelated spinners.
 */
export default function AuthLoading() {
  return <BrandedLoaderScreen label="Preparing" />;
}

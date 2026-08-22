import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

/**
 * Public marketing shell.
 *
 * A route group, so `(marketing)` never appears in a URL — the landing page stays
 * at `/` and the legal pages sit at `/terms` and `/privacy`.
 * The dashboard and auth routes deliberately do not use this shell.
 */
export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="flex flex-1 flex-col">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}

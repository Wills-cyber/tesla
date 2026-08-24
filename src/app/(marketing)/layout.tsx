import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { TeslaVehicleBackground } from "@/components/vehicles/tesla-vehicle-background";

/**
 * Public marketing shell.
 *
 * A route group, so `(marketing)` never appears in a URL — the landing page stays
 * at `/` and the legal pages sit at `/terms` and `/privacy`.
 * The dashboard and auth routes deliberately do not use this shell.
 *
 * The vehicle here is environment only — light and motes, no car. The landing
 * page's own hero owns the car at full volume, and a second one behind the
 * scrolling sections would fight it.
 */
export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col">
      <TeslaVehicleBackground
        fixed
        intensity="ambient"
        vehicle={false}
        grid={false}
      />

      <div className="relative z-10 flex flex-1 flex-col">
        <SiteHeader />
        <main id="main-content" className="flex flex-1 flex-col">
          {children}
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}

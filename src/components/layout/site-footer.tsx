import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/layout/container";
import { footerNav } from "@/config/navigation";
import { siteConfig } from "@/config/site";

/**
 * Site footer.
 *
 * A Server Component — it is entirely static, so there is no reason to ship it
 * to the client. The affiliation and risk language lives here rather than only
 * in the legal pages, because this is the part of the page people actually read
 * before signing up.
 */
export function SiteFooter() {
  const columns = [footerNav.navigation, footerNav.account, footerNav.legal];

  return (
    <footer className="relative mt-auto border-t border-white/8">
      {/* One faint wash to lift the footer off the page floor. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px rule-gradient"
      />

      <Container className="py-16 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)]">
          <div className="flex flex-col gap-5">
            <Logo size="md" />
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground text-pretty">
              {siteConfig.description}
            </p>
            <p className="max-w-sm text-xs leading-relaxed text-muted-foreground/65">
              {siteConfig.prelaunchNotice}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {columns.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <h2 className="eyebrow mb-5">{column.title}</h2>
                <ul className="flex flex-col gap-3.5">
                  {column.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-6 border-t border-white/8 pt-8">
          <p className="max-w-4xl text-xs leading-relaxed text-muted-foreground/65">
            {siteConfig.affiliationDisclaimer}
          </p>
          <p className="max-w-4xl text-xs leading-relaxed text-muted-foreground/65">
            Figures shown for any investment plan are stated plan terms, not
            guaranteed returns, and are not a record of funds received or paid.
            Investing involves risk, including possible loss of capital. Nothing
            on this site is financial, investment, tax or legal advice.
          </p>

          <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground/70">
              {siteConfig.copyright}
            </p>
            <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {footerNav.legal.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-xs text-muted-foreground/70 transition-colors hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </footer>
  );
}

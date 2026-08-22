import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { platformFeatures } from "@/config/content";
import { siteConfig } from "@/config/site";

/**
 * Auth shell.
 *
 * A split layout: the form on the left at a comfortable reading width, and a
 * brand panel on the right that is hidden below `lg` so small screens get the
 * form and nothing competing with it.
 *
 * Deliberately does not use the marketing header — a half-filled form is the
 * wrong place to offer nine navigation destinations.
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* ------------------------------------------------------- Form column */}
      <div className="relative flex flex-col">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        >
          <div className="absolute -top-32 -left-24 size-96 rounded-full bg-brand-surface blur-3xl" />
        </div>

        <div className="flex items-center justify-between gap-4 px-5 pt-6 md:px-10 lg:hidden">
          <Logo size="sm" />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft aria-hidden="true" className="size-3.5" />
            Back
          </Link>
        </div>

        <main
          id="main-content"
          className="flex flex-1 items-center justify-center px-5 py-12 md:px-10 lg:py-16"
        >
          <div className="w-full max-w-md">{children}</div>
        </main>

        <div className="hidden px-10 pb-8 lg:block">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft aria-hidden="true" className="size-3.5" />
            Back to home
          </Link>
        </div>
      </div>

      {/* ------------------------------------------------------ Brand column */}
      <aside className="relative hidden overflow-hidden border-l border-hairline lg:block">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="grid-field absolute inset-0 opacity-60" />
          <div className="absolute top-1/4 left-1/2 h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-brand-surface blur-3xl motion-safe:animate-drift" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-surface-3/70" />
        </div>

        <div className="relative flex h-full flex-col justify-between gap-12 p-12 xl:p-16">
          <Logo size="lg" />

          <div className="flex flex-col gap-8">
            <h2 className="max-w-md text-3xl leading-[1.15] font-medium tracking-[-0.025em] text-balance xl:text-[2.5rem]">
              {siteConfig.tagline}
            </h2>

            <ul className="flex flex-col gap-5">
              {platformFeatures.slice(0, 3).map((feature) => (
                <li key={feature.title} className="flex items-start gap-3.5">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg border border-brand-border bg-brand-surface text-brand"
                  >
                    <feature.icon className="size-4" />
                  </span>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium">{feature.title}</span>
                    <span className="max-w-sm text-xs leading-relaxed text-muted-foreground">
                      {feature.description}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p className="max-w-md text-[0.7rem] leading-relaxed text-subtle-foreground">
            {siteConfig.affiliationDisclaimer}
          </p>
        </div>
      </aside>
    </div>
  );
}

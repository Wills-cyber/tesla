import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { Reveal } from "@/components/common/reveal";
import { Button } from "@/components/ui/button";
import { authRoutes } from "@/config/navigation";

/** Closing CTA. The last thing on the page, so the disclosure travels with it. */
export function FinalCtaSection() {
  return (
    <Section spacing="md" divided aria-labelledby="final-cta-heading">
      <Container>
        <Reveal>
          <div className="relative isolate overflow-hidden rounded-3xl border border-white/10">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
              <div className="grid-field absolute inset-0 opacity-50" />
              <div className="absolute -top-32 left-1/2 h-80 w-[52rem] -translate-x-1/2 rounded-full bg-gold-500/12 blur-3xl" />
              <div className="absolute inset-0 bg-gradient-to-b from-ink-900/40 to-ink-950/90" />
            </div>

            <div className="flex flex-col items-center gap-7 px-6 py-16 text-center sm:px-12 sm:py-20 lg:py-24">
              <span className="inline-flex items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className="size-1.5 rounded-full bg-gold-500 shadow-[0_0_12px_2px_var(--gold-600)]"
                />
                <span className="eyebrow">Get started</span>
              </span>

              <h2
                id="final-cta-heading"
                className="max-w-2xl text-3xl leading-[1.1] font-medium tracking-[-0.025em] text-balance sm:text-4xl lg:text-5xl"
              >
                Start Your Investment Journey
              </h2>

              <p className="max-w-xl text-base leading-relaxed text-muted-foreground text-pretty">
                Create your account and explore available investment
                opportunities.
              </p>

              <div className="mt-2 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
                <Button
                  asChild
                  variant="accent"
                  size="xl"
                  className="group w-full sm:w-auto"
                >
                  <Link href={authRoutes.register}>
                    Get Started Now
                    <ArrowRight className="transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1" />
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="hairline"
                  size="xl"
                  className="w-full sm:w-auto"
                >
                  <Link href={authRoutes.login}>Login</Link>
                </Button>
              </div>

              <p className="max-w-lg text-xs leading-relaxed text-muted-foreground/65">
                Creating an account does not commit you to anything. Deposits,
                withdrawals and live investment activity are not yet available,
                and published plan figures are stated terms rather than
                guaranteed returns.
              </p>
            </div>
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}

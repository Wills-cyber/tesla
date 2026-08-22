import * as React from "react";

import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";

type LegalPageProps = {
  title: string;
  /** ISO date of the last substantive revision. */
  updated: string;
  intro: React.ReactNode;
  children: React.ReactNode;
};

/**
 * Shared chrome for the legal pages.
 *
 * Narrow measure and generous leading, because these are the pages people
 * actually have to read. The "last updated" line is prominent rather than buried
 * in a footnote.
 */
export function LegalPage({ title, updated, intro, children }: LegalPageProps) {
  return (
    <Section spacing="md">
      <Container width="narrow">
        <div className="flex flex-col gap-10">
          <header className="flex flex-col gap-4 border-b border-white/8 pb-8">
            <p className="eyebrow">Legal</p>
            <h1 className="text-3xl font-medium tracking-[-0.025em] sm:text-4xl">
              {title}
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
              {intro}
            </p>
            <p className="text-xs text-muted-foreground/65">
              Last updated {updated}
            </p>
          </header>

          <div className="flex flex-col gap-9">{children}</div>
        </div>
      </Container>
    </Section>
  );
}

/** One titled clause within a legal page. */
export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-medium">{heading}</h2>
      <div className="flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground [&_a]:text-gold-200 [&_a]:underline [&_a]:decoration-gold-500/40 [&_a]:underline-offset-4 [&_li]:leading-relaxed [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}

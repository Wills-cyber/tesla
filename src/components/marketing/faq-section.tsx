import Link from "next/link";

import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/common/section-heading";
import { Reveal } from "@/components/common/reveal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faqs } from "@/config/content";

/**
 * FAQ accordion.
 *
 * Radix's Accordion supplies the height animation, keyboard support and correct
 * `aria-expanded`/`aria-controls` wiring, so no custom disclosure logic is needed.
 * `type="single"` with `collapsible` keeps one panel open at a time.
 */
export function FaqSection() {
  return (
    <Section id="faq" divided aria-labelledby="faq-heading">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1fr)] lg:gap-16">
          <Reveal className="lg:sticky lg:top-28 lg:self-start">
            <SectionHeading
              eyebrow="FAQ"
              title={<span id="faq-heading">Questions, answered plainly</span>}
              description="What the platform does today, what it does not do yet, and what the published figures actually mean."
            >
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Still unclear on something? Read the{" "}
                <Link
                  href="/risk-disclosure"
                  className="text-gold-200 underline decoration-gold-500/40 underline-offset-4 transition-colors hover:decoration-gold-400"
                >
                  Risk Disclosure
                </Link>
                .
              </p>
            </SectionHeading>
          </Reveal>

          <Reveal>
            <Accordion
              type="single"
              collapsible
              className="flex flex-col overflow-hidden rounded-2xl border border-white/10"
            >
              {faqs.map((faq) => (
                <AccordionItem
                  key={faq.id}
                  value={faq.id}
                  className="border-b border-white/8 px-5 last:border-b-0 sm:px-6"
                >
                  <AccordionTrigger className="py-5 text-left text-base font-medium hover:no-underline sm:text-[1.05rem] [&>svg]:text-muted-foreground">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="pb-5 text-sm leading-relaxed text-muted-foreground text-pretty">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}

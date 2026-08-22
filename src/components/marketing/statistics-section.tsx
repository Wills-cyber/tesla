import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { RevealGroup, RevealItem } from "@/components/common/reveal";
import { platformStats } from "@/config/content";

/**
 * Platform facts.
 *
 * Deliberately not a "trust bar". There are no investor counts, capital totals,
 * payout figures, AUM numbers, success rates or partner logos here — the platform
 * is pre-launch and has none of those to report. Every value below describes how
 * the product is configured, which is a fact we can actually stand behind.
 */
export function StatisticsSection() {
  return (
    <Section
      spacing="md"
      divided
      aria-labelledby="platform-facts-heading"
      className="relative overflow-hidden"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="grid-field mask-fade-b absolute inset-0 opacity-45" />
      </div>

      <Container>
        <h2 id="platform-facts-heading" className="sr-only">
          Platform facts
        </h2>

        <RevealGroup
          as="dl"
          className="grid gap-px overflow-hidden rounded-2xl border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4"
          stagger={0.08}
        >
          {platformStats.map((stat) => (
            <RevealItem
              key={stat.label}
              className="flex flex-col gap-2.5 bg-surface-1 p-7 transition-colors duration-500 hover:bg-surface-2 lg:p-8"
            >
              <dt className="order-2 text-sm font-medium text-foreground/90">
                {stat.label}
              </dt>
              <dd
                data-numeric
                className="order-1 text-3xl leading-none font-medium tracking-tight text-brand-gradient lg:text-[2.5rem]"
              >
                {stat.value}
              </dd>
              <dd className="order-3 text-xs leading-relaxed text-muted-foreground">
                {stat.detail}
              </dd>
            </RevealItem>
          ))}
        </RevealGroup>

        <p className="mt-8 max-w-3xl text-xs leading-relaxed text-subtle-foreground">
          These figures describe the product itself. We publish no investor
          counts, capital totals or return histories, because the platform is
          pre-launch and has none to report.
        </p>
      </Container>
    </Section>
  );
}

import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/common/section-heading";
import { Reveal, RevealGroup, RevealItem } from "@/components/common/reveal";
import { platformFeatures } from "@/config/content";
import { siteConfig } from "@/config/site";

/** Why TESLA Electronics — four feature cards. */
export function FeaturesSection() {
  return (
    <Section id="why" divided aria-labelledby="why-heading">
      <Container>
        <div className="flex flex-col gap-14">
          <Reveal>
            <SectionHeading
              eyebrow="Why"
              title={<span id="why-heading">Why {siteConfig.name}</span>}
              description="Four principles the platform is being built around."
            />
          </Reveal>

          <RevealGroup
            as="ul"
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
            stagger={0.09}
          >
            {platformFeatures.map((feature) => (
              <RevealItem
                key={feature.title}
                as="li"
                className="group/feature surface relative flex flex-col gap-5 overflow-hidden rounded-2xl border border-white/10 p-6 transition-[border-color,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-gold-500/25 lg:p-7"
              >
                {/* Corner glow, revealed on hover only. */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-16 -right-16 size-32 rounded-full bg-gold-500/10 opacity-0 blur-2xl transition-opacity duration-700 group-hover/feature:opacity-100"
                />

                <span
                  aria-hidden="true"
                  className="relative grid size-11 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-gold-300 transition-colors duration-500 group-hover/feature:border-gold-500/25 group-hover/feature:bg-gold-500/8"
                >
                  <feature.icon className="size-5" />
                </span>

                <div className="relative flex flex-col gap-2.5">
                  <h3 className="text-lg font-medium">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                    {feature.description}
                  </p>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </Container>
    </Section>
  );
}

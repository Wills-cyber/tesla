import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/common/section-heading";
import { Reveal, RevealGroup, RevealItem } from "@/components/common/reveal";
import { aboutContent } from "@/config/content";
import { VehicleShowcaseGrid } from "@/components/vehicles/vehicle-showcase";

/** About band. Static prose — a Server Component by design. */
export function AboutSection() {
  return (
    <Section id="about" divided aria-labelledby="about-heading">
      <Container>
        <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16 xl:gap-20">
          <div className="flex flex-col gap-8">
            <Reveal>
              <SectionHeading
                eyebrow={aboutContent.eyebrow}
                title={<span id="about-heading">{aboutContent.heading}</span>}
              />
            </Reveal>

            <Reveal>
              <div className="flex flex-col gap-4">
                {aboutContent.body.map((paragraph) => (
                  <p
                    key={paragraph.slice(0, 32)}
                    className="text-base leading-relaxed text-muted-foreground text-pretty"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </Reveal>
          </div>

          <div className="flex flex-col gap-10">
            <RevealGroup as="ul" className="flex flex-col gap-4">
              {aboutContent.principles.map((principle) => (
                <RevealItem
                  key={principle.title}
                  as="li"
                  className="surface flex gap-4 rounded-xl border border-white/10 p-5 sm:p-6"
                >
                  <span
                    aria-hidden="true"
                    className="grid size-10 shrink-0 place-items-center rounded-lg border border-gold-500/20 bg-gold-500/8 text-gold-300"
                  >
                    <principle.icon className="size-4.5" />
                  </span>
                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-base font-medium">{principle.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                      {principle.description}
                    </p>
                  </div>
                </RevealItem>
              ))}
            </RevealGroup>

            <Reveal>
              <VehicleShowcaseGrid />
            </Reveal>
          </div>
        </div>
      </Container>
    </Section>
  );
}

import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/common/section-heading";
import { Reveal } from "@/components/common/reveal";
import { VehicleShowcase } from "@/components/vehicles/vehicle-showcase";

/**
 * Vehicle showcase band.
 *
 * The heading copy is careful: these are the vehicle *categories* the plans are
 * modelled around, not products offered or endorsed by any manufacturer.
 */
export function VehicleShowcaseSection() {
  return (
    <Section id="vehicles" divided aria-labelledby="vehicles-heading">
      <Container>
        <div className="flex flex-col gap-14">
          <Reveal>
            <SectionHeading
              eyebrow="Categories"
              title={<span id="vehicles-heading">The vehicle categories behind the plans</span>}
              description="Each plan is modelled on a segment of the electric vehicle market. These categories are referenced descriptively — no manufacturer supplies, sponsors or endorses the plans on this platform."
            />
          </Reveal>

          <Reveal>
            <VehicleShowcase />
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}

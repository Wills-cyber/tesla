import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/common/section-heading";
import { Reveal, RevealGroup, RevealItem } from "@/components/common/reveal";
import { StatusPill } from "@/components/common/status-pill";
import { processSteps } from "@/config/content";
import { cn } from "@/lib/utils";

/**
 * How It Works — four steps.
 *
 * Step 3 is rendered in a deliberately muted state: funding is not implemented,
 * and the step says so instead of implying a working deposit flow.
 */
export function HowItWorksSection() {
  return (
    <Section id="how-it-works" divided aria-labelledby="how-it-works-heading">
      <Container>
        <div className="flex flex-col gap-14">
          <Reveal>
            <SectionHeading
              eyebrow="Process"
              title={<span id="how-it-works-heading">How It Works</span>}
              description="Four steps from account creation to tracking a position. Two of them are live today."
            />
          </Reveal>

          <RevealGroup
            as="ol"
            className="grid gap-px overflow-hidden rounded-2xl border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4"
            stagger={0.09}
          >
            {processSteps.map((step) => (
              <RevealItem
                key={step.number}
                as="li"
                className={cn(
                  "group/step relative flex flex-col gap-5 bg-surface-1 p-7 transition-colors duration-500 lg:p-8",
                  step.pending ? "bg-surface-1" : "hover:bg-surface-2"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <span
                    data-numeric
                    className={cn(
                      "text-3xl leading-none font-medium tracking-tight transition-colors duration-500",
                      step.pending
                        ? "text-muted-foreground/45"
                        : "text-hairline-strong group-hover/step:text-brand"
                    )}
                  >
                    {step.number}
                  </span>

                  <span
                    aria-hidden="true"
                    className={cn(
                      "grid size-10 place-items-center rounded-lg border transition-colors duration-500",
                      step.pending
                        ? "border-hairline bg-surface-2 text-subtle-foreground"
                        : "border-hairline bg-surface-2 text-brand group-hover/step:border-brand-border group-hover/step:bg-brand-surface"
                    )}
                  >
                    <step.icon className="size-4.5" />
                  </span>
                </div>

                <div className="flex flex-col gap-2.5">
                  <h3
                    className={cn(
                      "text-lg font-medium",
                      step.pending && "text-foreground/75"
                    )}
                  >
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                    {step.description}
                  </p>
                </div>

                {step.pendingLabel && (
                  <StatusPill tone="brand" dot className="mt-auto self-start">
                    {step.pendingLabel}
                  </StatusPill>
                )}
              </RevealItem>
            ))}
          </RevealGroup>

          <Reveal>
            <p className="max-w-3xl text-xs leading-relaxed text-subtle-foreground">
              No money moves through the platform today. Deposits will open only
              once payment processing, account verification and the required
              compliance review are complete.
            </p>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}

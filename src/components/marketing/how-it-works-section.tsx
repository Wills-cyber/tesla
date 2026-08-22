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
            className="grid gap-px overflow-hidden rounded-2xl border border-white/8 bg-white/6 sm:grid-cols-2 lg:grid-cols-4"
            stagger={0.09}
          >
            {processSteps.map((step) => (
              <RevealItem
                key={step.number}
                as="li"
                className={cn(
                  "group/step relative flex flex-col gap-5 bg-ink-950 p-7 transition-colors duration-500 lg:p-8",
                  step.pending ? "bg-ink-950" : "hover:bg-ink-900/70"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <span
                    data-numeric
                    className={cn(
                      "text-3xl leading-none font-medium tracking-tight transition-colors duration-500",
                      step.pending
                        ? "text-muted-foreground/45"
                        : "text-white/12 group-hover/step:text-gold-500/70"
                    )}
                  >
                    {step.number}
                  </span>

                  <span
                    aria-hidden="true"
                    className={cn(
                      "grid size-10 place-items-center rounded-lg border transition-colors duration-500",
                      step.pending
                        ? "border-white/8 bg-white/[0.02] text-muted-foreground/60"
                        : "border-white/10 bg-white/[0.03] text-gold-300 group-hover/step:border-gold-500/25 group-hover/step:bg-gold-500/8"
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
                  <StatusPill tone="gold" dot className="mt-auto self-start">
                    {step.pendingLabel}
                  </StatusPill>
                )}
              </RevealItem>
            ))}
          </RevealGroup>

          <Reveal>
            <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground/70">
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

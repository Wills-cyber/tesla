import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/common/section-heading";
import { Reveal, RevealGroup, RevealItem } from "@/components/common/reveal";
import { InvestmentPlanCard } from "@/components/investment/investment-plan-card";
import { StatusPill } from "@/components/common/status-pill";
import type { InvestmentPlan } from "@/types/investment";

type InvestmentPlansSectionProps = {
  plans: readonly InvestmentPlan[];
};

/**
 * The Investment Plans band.
 *
 * Plans arrive as a prop rather than being imported here, so this section renders
 * identically whether the catalogue came from `src/config/investment-plans.ts` or
 * from the `investment_plans` table once Supabase is connected.
 */
export function InvestmentPlansSection({ plans }: InvestmentPlansSectionProps) {
  return (
    <Section id="investment-plans" aria-labelledby="investment-plans-heading">
      <Container>
        <div className="flex flex-col gap-14">
          <Reveal>
            <SectionHeading
              eyebrow="Plans"
              title={<span id="investment-plans-heading">Investment Plans</span>}
              description="Explore available fixed-term vehicle investment opportunities."
            >
              <StatusPill tone="success" dot className="mt-1 self-start">
                All plans available
              </StatusPill>
            </SectionHeading>
          </Reveal>

          <RevealGroup
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            stagger={0.1}
          >
            {plans.map((plan) => (
              // `dialog`, not `link`: `/invest/[slug]` sits behind the auth guard,
              // and a visitor should be able to read the full terms before they
              // create an account.
              <InvestmentPlanCard
                key={plan.id}
                plan={plan}
                action="dialog"
                animate
              />
            ))}

            {/* Balances the grid and sets the expectation for what follows. */}
            <RevealItem className="flex">
              <div className="flex flex-1 flex-col justify-center gap-4 rounded-2xl border border-dashed border-hairline bg-surface-2 p-7 text-center sm:text-left">
                <span className="eyebrow">More plans</span>
                <p className="text-lg font-medium text-foreground/90">
                  Additional plans in preparation
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                  Further fixed-term plans covering other electric vehicle
                  categories are being prepared. Each will publish its full terms
                  here before it becomes available.
                </p>
              </div>
            </RevealItem>
          </RevealGroup>
        </div>
      </Container>
    </Section>
  );
}

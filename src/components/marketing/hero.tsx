"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { ArrowRight, ChevronDown, Gauge } from "lucide-react";

import { Container } from "@/components/layout/container";
import { StatusPill } from "@/components/common/status-pill";
import { VehicleImage } from "@/components/vehicles/vehicle-image";
import { Button } from "@/components/ui/button";
import { authRoutes } from "@/config/navigation";
import { heroVehicleImage } from "@/config/vehicles";
import { useAnchorScroll } from "@/hooks/use-anchor-scroll";
import { EASE_LUXE, headlineWord, transitions } from "@/lib/motion";

const HEADLINE = ["Invest", "in", "the", "Future", "of", "Mobility"] as const;

/** Small floating spec chips that orbit the vehicle. Purely decorative. */
const FLOATING_CHIPS = [
  {
    label: "Fixed Term",
    value: "30 Days",
    className: "left-[2%] top-[16%] md:left-[-4%]",
    delay: 0,
  },
  {
    label: "Payment Periods",
    value: "4 Weekly",
    className: "right-[1%] top-[6%] md:right-[-2%]",
    delay: 0.9,
  },
  {
    label: "Category",
    value: "Electric Vehicle",
    className: "bottom-[10%] left-[8%] md:left-[2%]",
    delay: 1.8,
  },
] as const;

export function Hero() {
  const scrollToAnchor = useAnchorScroll();
  const sectionRef = React.useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  // Gentle depth: the vehicle drifts up and fades as the hero scrolls away.
  const vehicleY = useTransform(scrollYProgress, [0, 1], [0, -70]);
  const vehicleOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0.15]);
  const glowY = useTransform(scrollYProgress, [0, 1], [0, 120]);

  return (
    <section
      ref={sectionRef}
      id="home"
      aria-labelledby="hero-heading"
      className="relative isolate overflow-hidden pt-14 pb-24 md:pt-20 md:pb-32 lg:pt-24 lg:pb-40"
    >
      <HeroBackdrop glowY={glowY} />

      <Container className="relative">
        <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-12 xl:gap-20">
          {/* ---------------------------------------------------- Copy column */}
          <div className="flex flex-col items-start gap-8">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...transitions.base, delay: 0.1 }}
            >
              <StatusPill tone="brand" dot>
                Pre-launch · Deposits Coming Soon
              </StatusPill>
            </motion.div>

            <h1
              id="hero-heading"
              className="max-w-[15ch] text-[2.6rem] leading-[1.04] font-medium tracking-[-0.03em] sm:text-6xl lg:text-[4.25rem] xl:text-[4.75rem]"
            >
              <motion.span
                initial="hidden"
                animate="visible"
                transition={{ staggerChildren: 0.075, delayChildren: 0.18 }}
                className="inline"
              >
                {HEADLINE.map((word, index) => (
                  <React.Fragment key={word}>
                    <motion.span
                      variants={headlineWord}
                      className={
                        index >= 3
                          ? "inline-block text-brand-gradient"
                          : "inline-block"
                      }
                    >
                      {word}
                    </motion.span>
                    {index < HEADLINE.length - 1 && " "}
                  </React.Fragment>
                ))}
              </motion.span>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...transitions.base, delay: 0.72 }}
              className="max-w-xl text-base leading-relaxed text-muted-foreground text-pretty sm:text-lg"
            >
              Explore long-term investment opportunities built around the future
              of electric vehicles, mobility and innovative technology.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...transitions.base, delay: 0.86 }}
              className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4"
            >
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
                variant="hairline"
                size="xl"
                className="w-full sm:w-auto"
                onClick={() => scrollToAnchor("#investment-plans")}
              >
                Explore Investment Plans
              </Button>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ ...transitions.base, delay: 1 }}
              className="max-w-md text-xs leading-relaxed text-subtle-foreground"
            >
              Account creation is open. Deposits, withdrawals and live investment
              activity are not yet available — plan figures shown are stated
              terms.
            </motion.p>
          </div>

          {/* ------------------------------------------------- Vehicle column */}
          <motion.div
            style={{ y: vehicleY, opacity: vehicleOpacity }}
            initial={{ opacity: 0, scale: 0.965 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.15, ease: EASE_LUXE, delay: 0.34 }}
            className="relative mx-auto w-full max-w-2xl lg:max-w-none"
          >
            <div className="relative">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-[8%] top-1/2 h-[62%] -translate-y-1/2 rounded-[50%] bg-brand-surface-strong blur-3xl"
              />

              <div className="motion-safe:animate-float-slow">
                <VehicleImage
                  source={heroVehicleImage}
                  priority
                  sizes="(min-width: 1024px) 46vw, 92vw"
                  className="relative"
                  imageClassName="drop-shadow-[0_36px_80px_rgba(0,0,0,0.65)]"
                />
              </div>

              {FLOATING_CHIPS.map((chip) => (
                <motion.div
                  key={chip.label}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.7,
                    ease: EASE_LUXE,
                    delay: 1 + chip.delay * 0.16,
                  }}
                  className={`absolute hidden sm:block ${chip.className}`}
                >
                  <div
                    className="glass flex flex-col gap-1 rounded-lg border border-hairline px-3.5 py-2.5 motion-safe:animate-float"
                    style={{ animationDelay: `${chip.delay}s` }}
                  >
                    <span className="text-[0.6rem] tracking-[0.18em] text-muted-foreground uppercase">
                      {chip.label}
                    </span>
                    <span
                      data-numeric
                      className="text-sm font-medium text-foreground"
                    >
                      {chip.value}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.button
          type="button"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.6 }}
          onClick={() => scrollToAnchor("#investment-plans")}
          className="mx-auto mt-16 hidden items-center gap-2 rounded-full border border-hairline px-4 py-2 text-xs tracking-[0.16em] text-muted-foreground uppercase transition-colors hover:border-hairline-strong hover:text-foreground lg:flex"
        >
          <Gauge className="size-3.5" />
          Scroll to explore
          <ChevronDown className="size-3.5 motion-safe:animate-bounce" />
        </motion.button>
      </Container>
    </section>
  );
}

function HeroBackdrop({ glowY }: { glowY: MotionValue<number> }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      {/* Engineering grid, faded out toward the bottom */}
      <div className="grid-field mask-fade-b absolute inset-0 opacity-70" />

      {/* Primary gold wash */}
      <motion.div
        style={{ y: glowY }}
        className="absolute -top-40 left-1/2 h-[46rem] w-[76rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklch,var(--gold-500)_14%,transparent),transparent)] blur-2xl motion-safe:animate-drift"
      />

      {/* Cool counter-light so the gold doesn't read as a single flat tint */}
      <div className="absolute top-1/3 -left-40 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(closest-side,rgba(120,150,220,0.10),transparent)] blur-2xl" />

      {/* Floor fade into the next section */}
      <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-b from-transparent to-background" />
    </div>
  );
}

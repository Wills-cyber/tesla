"use client";

import * as React from "react";
import { motion, type Variants } from "motion/react";

import { fadeUp, revealViewport, staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  /** Seconds. Use sparingly — `RevealGroup` is better for sequences. */
  delay?: number;
  variants?: Variants;
  as?: "div" | "section" | "li" | "article" | "span";
  /**
   * Animates on mount instead of on scroll.
   *
   * Use for anything already on screen when the route opens. A scroll-triggered
   * entrance on above-the-fold content is a bet that the observer fires, and if it
   * doesn't the content is simply invisible — a far worse failure than a missing
   * animation.
   */
  immediate?: boolean;
};

/**
 * Scroll-triggered entrance.
 *
 * Fires once as soon as any part of the element enters the viewport, so content is
 * settled by the time the reader reaches it. Reduced-motion users get the final
 * state immediately, handled globally by `MotionConfig reducedMotion="user"`.
 *
 * Pass `immediate` for content that is on screen on arrival — see the note on
 * `revealViewport` about why a scroll gate must never decide whether primary
 * content is visible at all.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  variants = fadeUp,
  as = "div",
  immediate = false,
}: RevealProps) {
  const Component = motion[as];

  return (
    <Component
      initial="hidden"
      {...(immediate
        ? { animate: "visible" as const }
        : { whileInView: "visible" as const, viewport: revealViewport })}
      variants={variants}
      transition={delay ? { delay } : undefined}
      className={cn(className)}
    >
      {children}
    </Component>
  );
}

type RevealGroupProps = {
  children: React.ReactNode;
  className?: string;
  /** Seconds between each child's entrance. */
  stagger?: number;
  delayChildren?: number;
  as?: "div" | "ul" | "ol" | "dl";
  /** Animates on mount instead of on scroll. See `Reveal`. */
  immediate?: boolean;
};

/**
 * Staggers direct `RevealItem` children. Pair the two — a bare element inside
 * `RevealGroup` will not animate.
 */
export function RevealGroup({
  children,
  className,
  stagger = 0.08,
  delayChildren = 0.05,
  as = "div",
  immediate = false,
}: RevealGroupProps) {
  const Component = motion[as];

  return (
    <Component
      initial="hidden"
      {...(immediate
        ? { animate: "visible" as const }
        : { whileInView: "visible" as const, viewport: revealViewport })}
      variants={staggerContainer(stagger, delayChildren)}
      className={cn(className)}
    >
      {children}
    </Component>
  );
}

type RevealItemProps = {
  children: React.ReactNode;
  className?: string;
  variants?: Variants;
  as?: "div" | "li" | "article" | "span";
};

export function RevealItem({
  children,
  className,
  variants = fadeUp,
  as = "div",
}: RevealItemProps) {
  const Component = motion[as];

  return (
    <Component variants={variants} className={cn(className)}>
      {children}
    </Component>
  );
}

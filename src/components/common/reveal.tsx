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
};

/**
 * Scroll-triggered entrance.
 *
 * Fires once when a quarter of the element is visible, so content is already
 * settled by the time the reader reaches it. Reduced-motion users get the final
 * state immediately, handled globally by `MotionConfig reducedMotion="user"`.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  variants = fadeUp,
  as = "div",
}: RevealProps) {
  const Component = motion[as];

  return (
    <Component
      initial="hidden"
      whileInView="visible"
      viewport={revealViewport}
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
}: RevealGroupProps) {
  const Component = motion[as];

  return (
    <Component
      initial="hidden"
      whileInView="visible"
      viewport={revealViewport}
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

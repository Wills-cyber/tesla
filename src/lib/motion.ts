import type { Transition, Variants } from "motion/react";

/**
 * Shared motion language.
 *
 * Two rules keep this from getting noisy: everything eases out of the same
 * curve, and nothing travels further than ~24px. Reduced-motion is handled
 * globally by `<MotionConfig reducedMotion="user">` in `src/components/providers.tsx`,
 * so individual components don't need to branch on it.
 */

export const EASE_LUXE = [0.22, 1, 0.36, 1] as const;
export const EASE_IN_OUT_LUXE = [0.65, 0, 0.35, 1] as const;

export const transitions = {
  fast: { duration: 0.28, ease: EASE_LUXE },
  base: { duration: 0.55, ease: EASE_LUXE },
  slow: { duration: 0.9, ease: EASE_LUXE },
  spring: { type: "spring", stiffness: 220, damping: 28, mass: 0.9 },
} satisfies Record<string, Transition>;

/** Viewport config for scroll reveals: fire once, slightly before full entry. */
export const revealViewport = { once: true, amount: 0.25, margin: "0px 0px -80px 0px" };

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: transitions.base },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transitions.base },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: { opacity: 1, scale: 1, transition: transitions.base },
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: transitions.base },
};

/** Parent for staggered lists. Children should use `fadeUp` or `scaleIn`. */
export function staggerContainer(
  stagger = 0.08,
  delayChildren = 0.05
): Variants {
  return {
    hidden: {},
    visible: {
      transition: { staggerChildren: stagger, delayChildren },
    },
  };
}

/** Word-by-word headline reveal used in the hero. */
export const headlineWord: Variants = {
  hidden: { opacity: 0, y: "0.6em", filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: "0em",
    filter: "blur(0px)",
    transition: { duration: 0.85, ease: EASE_LUXE },
  },
};

export const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transitions.fast },
  exit: { opacity: 0, transition: transitions.fast },
};

export const drawerVariants: Variants = {
  hidden: { opacity: 0, y: -12 },
  visible: { opacity: 1, y: 0, transition: transitions.base },
  exit: { opacity: 0, y: -8, transition: transitions.fast },
};

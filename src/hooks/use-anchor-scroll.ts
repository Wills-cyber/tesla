"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * Smooth-scrolls to an in-page anchor, accounting for the sticky header.
 *
 * When the anchor lives on the landing page but the user is elsewhere, this
 * navigates to `/#id` and lets the browser handle the jump instead.
 *
 * Movement is skipped entirely for `prefers-reduced-motion: reduce` — the hook
 * jumps straight to the target.
 */
export function useAnchorScroll() {
  const router = useRouter();
  const pathname = usePathname();

  return useCallback(
    (href: string) => {
      const id = href.replace(/^\/?#/, "");

      if (pathname !== "/") {
        router.push(`/#${id}`);
        return;
      }

      const target = document.getElementById(id);
      if (!target) {
        router.push(`/#${id}`);
        return;
      }

      const prefersReduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      target.scrollIntoView({
        behavior: prefersReduced ? "auto" : "smooth",
        block: "start",
      });

      // Move focus so keyboard and screen-reader users land where the page did.
      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });

      window.history.replaceState(null, "", `#${id}`);
    },
    [pathname, router]
  );
}

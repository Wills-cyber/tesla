"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Tracks whether the page has scrolled past `threshold`.
 *
 * Scroll position is external state, so it is read through
 * `useSyncExternalStore` rather than mirrored into React state. Two benefits over
 * an effect: a page loaded already scrolled reports the correct value on its
 * first client render, and there is no extra render pass on mount.
 *
 * Events are throttled to one read per animation frame so the sticky header can
 * react to scrolling without forcing layout on every event.
 */
export function useScrolled(threshold = 12): boolean {
  const subscribe = useCallback((onStoreChange: () => void) => {
    let frame = 0;

    const onScroll = () => {
      if (frame !== 0) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        onStoreChange();
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, []);

  const getSnapshot = useCallback(
    () => window.scrollY > threshold,
    [threshold]
  );

  // Server-rendered markup always starts from the top of the page.
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

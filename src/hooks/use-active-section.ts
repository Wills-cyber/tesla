"use client";

import { useEffect, useState } from "react";

/**
 * Scroll-spy for the landing page navigation.
 *
 * Observes a band across the upper-middle of the viewport and reports the last
 * section to enter it, so the highlighted nav item matches what the reader is
 * actually looking at rather than whatever is technically topmost.
 *
 * Returns `null` when no observed section is in view (e.g. at the very top).
 * The `enabled` case is derived on the way out rather than written into state, so
 * the effect only ever sets state from the observer callback.
 */
export function useActiveSection(
  ids: readonly string[],
  enabled = true
): string | null {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || ids.length === 0) return;

    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);

    if (elements.length === 0) return;

    const visible = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }

        // Preserve document order rather than intersection order.
        const next = ids.filter((id) => visible.has(id));
        setActive(next.length > 0 ? next[next.length - 1] : null);
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: 0 }
    );

    for (const element of elements) observer.observe(element);

    return () => observer.disconnect();
  }, [ids, enabled]);

  // Off-page (or nothing to observe) means there is no active section.
  return enabled ? active : null;
}

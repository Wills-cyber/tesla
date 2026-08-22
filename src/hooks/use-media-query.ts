"use client";

import { useEffect, useState } from "react";

/**
 * SSR-safe media query hook.
 *
 * Starts `false` on the server and during the first client render, then settles
 * after mount. Use it for behaviour, not layout — layout should be CSS so it is
 * correct before hydration.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const list = window.matchMedia(query);
    setMatches(list.matches);

    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    list.addEventListener("change", onChange);

    return () => list.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

export const useIsDesktop = () => useMediaQuery("(min-width: 1024px)");

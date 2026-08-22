"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * SSR-safe media query hook.
 *
 * Built on `useSyncExternalStore` because `matchMedia` is exactly what that API
 * is for: an external source of truth React should subscribe to. Reading the
 * value through a snapshot rather than copying it into state means no cascading
 * render on mount and no window where the value is stale.
 *
 * Use it for behaviour, not layout — layout belongs in CSS so it is correct
 * before hydration rather than one frame after it.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onStoreChange);
      return () => list.removeEventListener("change", onStoreChange);
    },
    [query]
  );

  const getSnapshot = useCallback(
    () => window.matchMedia(query).matches,
    [query]
  );

  // The server has no viewport, so `false` keeps the first client render
  // identical to the server's and hydration stays clean.
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

export const useIsDesktop = () => useMediaQuery("(min-width: 1024px)");

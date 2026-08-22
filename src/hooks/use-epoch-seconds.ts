"use client";

import { useSyncExternalStore } from "react";

/**
 * The wall clock, once a second.
 *
 * A ticking countdown is a subscription to an external system — the clock — not
 * derived React state, so it belongs in `useSyncExternalStore` rather than a
 * `setInterval` that calls `setState`. Expressing it this way means no effect
 * writes state, no cascading render, and React handles the hydration boundary
 * itself.
 *
 * The snapshot is quantised to whole seconds deliberately. `Date.now()` returns a
 * new value on every call, which React would treat as a store that never settles;
 * seconds are stable for the whole second they describe.
 *
 * `null` during server render and hydration, because the server's clock is not the
 * user's and a countdown is precisely the kind of value that would mismatch.
 * Callers must handle `null` by rendering nothing time-dependent.
 */
const subscribe = (onChange: () => void) => {
  const timer = window.setInterval(onChange, 1000);
  return () => window.clearInterval(timer);
};

const clientSnapshot = () => Math.floor(Date.now() / 1000);
const serverSnapshot = () => null;

export function useEpochSeconds(): number | null {
  return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
}

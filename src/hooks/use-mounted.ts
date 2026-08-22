"use client";

import { useSyncExternalStore } from "react";

/** Nothing to subscribe to: hydration happens once and never reverses. */
const subscribe = () => () => {};

/**
 * True once the component has hydrated on the client.
 *
 * Guards portals and other client-only output so the server and first client
 * render agree. Implemented with `useSyncExternalStore`'s two snapshots — the
 * server one returns `false`, the client one `true` — which expresses "these two
 * environments differ" directly instead of forcing a re-render from an effect.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}

"use client";

import { useEffect, useState } from "react";

/**
 * True once the component has mounted on the client.
 *
 * Guards portals and other client-only output so the server and first client
 * render agree and hydration stays clean.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

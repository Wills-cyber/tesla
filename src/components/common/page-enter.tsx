"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

type PageEnterProps = {
  children: React.ReactNode;
  className?: string;
  /** Render as the page's `<main>` rather than a wrapper. */
  as?: "div" | "main";
  /** Forwarded when rendering as `main`, so the skip link still lands. */
  id?: string;
};

/**
 * The route entrance shared by every page in the product.
 *
 * Each direct child — a page's top-level sections — fades and lifts into place in
 * sequence, so arriving on a route resolves rather than snapping. The staggering
 * is entirely CSS (`.page-enter` in `globals.css`): a page is server-rendered, and
 * asking it to hydrate a motion component per section just to move 14px would put
 * JavaScript on the critical path for something the compositor does for free.
 *
 * The one thing CSS cannot do is know that the route changed. `<main>` lives in
 * the layout and survives navigation, so its children's animations would fire once
 * on first load and never again. Keying on the pathname discards the element on
 * every navigation, which re-runs the entrance — that is the whole reason this is a
 * client component, and it holds no state and registers no listener.
 *
 * `prefers-reduced-motion` collapses the animation to its settled frame through the
 * global block, so reduced-motion users get the content immediately.
 */
export function PageEnter({
  children,
  className,
  as = "div",
  id,
}: PageEnterProps) {
  const pathname = usePathname();
  const Component = as;

  return (
    <Component key={pathname} id={id} className={cn("page-enter", className)}>
      {children}
    </Component>
  );
}

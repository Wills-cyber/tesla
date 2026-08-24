"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { TeslaVehicleBackground } from "@/components/vehicles/tesla-vehicle-background";
import { appRoutes } from "@/config/navigation";

type BackdropProps = React.ComponentProps<typeof TeslaVehicleBackground>;

/**
 * Per-area presentation levels.
 *
 * Order matters: the first prefix match wins, so the more specific route sits
 * above the area it belongs to (`/wallet/activity` before `/wallet`).
 *
 * The rule behind the numbers: the more numeric or transactional the page, the
 * further back the vehicle goes. Dashboard and Profile can carry a visible
 * silhouette because they are read as panels; Wallet and the activity ledger get
 * light and almost no car, because a balance and a wallet address are the two
 * things on this platform that must never compete with decoration.
 */
const PRESETS: readonly { prefix: string; props: BackdropProps }[] = [
  {
    prefix: appRoutes.walletActivity,
    props: {
      intensity: "ambient",
      opacity: 0.07,
      size: "sm",
      position: "bottom-right",
      grid: false,
      particles: false,
      lighting: false,
    },
  },
  {
    prefix: appRoutes.withdraw,
    props: {
      intensity: "ambient",
      opacity: 0.06,
      size: "sm",
      position: "bottom-right",
      grid: false,
      particles: false,
      streaks: false,
      lighting: false,
    },
  },
  {
    prefix: appRoutes.wallet,
    props: {
      intensity: "ambient",
      size: "sm",
      position: "bottom-right",
      grid: false,
      particles: false,
      lighting: false,
    },
  },
  {
    prefix: appRoutes.dashboard,
    props: {
      intensity: "subtle",
      size: "lg",
      position: "bottom-right",
      grid: true,
      particles: true,
      lighting: true,
    },
  },
  {
    // Plan cards are the whole point of this area, so the car goes low and
    // centred — behind the grid, never across it.
    prefix: appRoutes.invest,
    props: {
      intensity: "ambient",
      opacity: 0.12,
      size: "md",
      position: "bottom-center",
      grid: true,
      particles: false,
      lighting: true,
    },
  },
  {
    prefix: appRoutes.investments,
    props: {
      intensity: "ambient",
      opacity: 0.12,
      size: "md",
      position: "bottom-left",
      grid: false,
      particles: true,
      lighting: false,
    },
  },
  {
    prefix: appRoutes.notifications,
    props: {
      intensity: "ambient",
      size: "sm",
      position: "bottom-right",
      grid: false,
      particles: true,
      lighting: true,
    },
  },
  {
    prefix: appRoutes.profile,
    props: {
      intensity: "subtle",
      opacity: 0.14,
      size: "md",
      position: "bottom-right",
      grid: true,
      particles: true,
      lighting: true,
    },
  },
] as const;

const FALLBACK: BackdropProps = {
  intensity: "ambient",
  size: "sm",
  position: "bottom-right",
  grid: false,
  particles: false,
};

/**
 * The application shell's vehicle backdrop.
 *
 * Mounted once in `(app)/layout.tsx` rather than per page: one fixed layer that
 * survives route changes costs nothing to switch between areas, and it keeps the
 * animation defined in exactly one place. The only thing this component decides
 * is *how loud* the treatment should be for the current route.
 *
 * Client-only because it reads the pathname. Everything it renders is inert
 * decoration — there is no state, no effect and no listener.
 */
export function AppVehicleBackdrop() {
  const pathname = usePathname();

  const preset =
    PRESETS.find(
      ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    )?.props ?? FALLBACK;

  return <TeslaVehicleBackground fixed {...preset} />;
}

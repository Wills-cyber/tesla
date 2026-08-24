"use client";

import * as React from "react";

import { LogoMark } from "@/components/brand/logo";
import { QrCapacityError, encodeQrCode, qrCodeToSvgPath } from "@/lib/qr/qr-code";
import { cn } from "@/lib/utils";

type QrCodeProps = {
  /** The wallet URI or address to encode. */
  value: string;
  /** Rendered size in pixels. The SVG scales, so this is purely layout. */
  size?: number;
  /** Accessible description. The value itself is also exposed as a text label. */
  label?: string;
  className?: string;
};

/**
 * Renders a QR code for a deposit address.
 *
 * Encoded locally by `src/lib/qr/qr-code.ts` — no image service, so the address
 * never leaves the device. A quiet zone of four modules is included because
 * scanners need it to find the symbol; cropping it is the single most common
 * reason a QR code fails to read.
 *
 * The brand mark sits in the centre. Level M tolerates roughly 15% loss, and the
 * overlay covers well under that, so the code still scans.
 */
export function QrCode({
  value,
  size = 176,
  label = "Deposit address QR code",
  className,
}: QrCodeProps) {
  const code = React.useMemo(() => {
    try {
      return { ok: true as const, code: encodeQrCode(value) };
    } catch (error) {
      if (error instanceof QrCapacityError) {
        return { ok: false as const, reason: "too-long" as const };
      }
      throw error;
    }
  }, [value]);

  if (!code.ok) {
    return (
      <div
        role="img"
        aria-label="QR code unavailable"
        className={cn(
          "flex items-center justify-center rounded-2xl border border-dashed border-hairline-strong bg-surface-2 p-4 text-center text-xs text-muted-foreground",
          className
        )}
        style={{ width: size, height: size }}
      >
        This address is too long to encode as a QR code. Copy it instead.
      </div>
    );
  }

  const QUIET_ZONE = 4;
  const modules = code.code.size;
  const extent = modules + QUIET_ZONE * 2;
  const path = qrCodeToSvgPath(code.code);

  // Roughly 22% of the width: comfortably inside level M's recovery budget.
  const markSize = modules * 0.22;
  const markOffset = QUIET_ZONE + (modules - markSize) / 2;

  return (
    <div
      className={cn(
        "rounded-2xl border border-hairline bg-white p-2 shadow-card",
        className
      )}
    >
      <svg
        viewBox={`0 0 ${extent} ${extent}`}
        width={size}
        height={size}
        role="img"
        aria-label={label}
        shapeRendering="crispEdges"
        className="block size-full"
      >
        <rect width={extent} height={extent} fill="#ffffff" />
        <g transform={`translate(${QUIET_ZONE} ${QUIET_ZONE})`}>
          <path d={path} fill="#111318" />
        </g>

        {/* Knock out a clear area, then place the mark inside it. */}
        <rect
          x={markOffset - 0.6}
          y={markOffset - 0.6}
          width={markSize + 1.2}
          height={markSize + 1.2}
          rx={1.4}
          fill="#ffffff"
        />
        <foreignObject
          x={markOffset}
          y={markOffset}
          width={markSize}
          height={markSize}
        >
          <span className="flex size-full items-center justify-center text-ink-900">
            <LogoMark variant="plate" className="size-full" />
          </span>
        </foreignObject>
      </svg>
    </div>
  );
}

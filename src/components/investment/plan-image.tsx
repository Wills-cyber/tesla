"use client";

import * as React from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Vehicle artwork for an investment plan.
 *
 * ---------------------------------------------------------------------------
 * The path is the contract
 * ---------------------------------------------------------------------------
 * `src` comes straight from `plan.imageUrl`, which resolves to
 * `public/images/investments/<slug>.webp`. Real photography replaces those files
 * in place and this component needs no change — which is the whole point of not
 * routing plan artwork through a lookup table.
 *
 * ---------------------------------------------------------------------------
 * Why the fallback exists
 * ---------------------------------------------------------------------------
 * The files shipped today are generated placeholders. If one is ever missing,
 * truncated, or mid-replacement, `next/image` fails and would otherwise leave a
 * blank hole with no indication whether the layout is broken or the asset is
 * simply absent. The fallback answers that: a branded frame naming the vehicle,
 * which reads as "no image yet" rather than "this page is broken".
 *
 * ---------------------------------------------------------------------------
 * Aspect ratio
 * ---------------------------------------------------------------------------
 * The frame owns the ratio (16:9 by default) and the image is `object-cover`
 * inside it. Layout is therefore identical before and after real artwork lands,
 * whatever dimensions the replacement files happen to have — no reflow when the
 * assets change, and never a stretched vehicle.
 */
export function PlanImage({
  src,
  alt,
  sizes = "(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 92vw",
  priority = false,
  className,
  imageClassName,
  ratio = "16/9",
}: {
  src: string;
  /** Names the vehicle. Empty string marks the image decorative. */
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
  ratio?: "16/9" | "4/3" | "3/2";
}) {
  /**
   * The src that failed, rather than a boolean.
   *
   * Storing *which* path failed means the failure resets itself when `src`
   * changes — no effect, no stale error carried over to a different image, and
   * nothing to keep in sync. A plain `failed` flag would need an effect to clear
   * it, which is both more code and a cascading render.
   */
  const [failedSrc, setFailedSrc] = React.useState<string | null>(null);
  const failed = failedSrc === src;

  const ratioClass =
    ratio === "4/3"
      ? "aspect-[4/3]"
      : ratio === "3/2"
        ? "aspect-[3/2]"
        : "aspect-[16/9]";

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden bg-surface-2",
        ratioClass,
        className
      )}
    >
      {/* Soft gold wash under the vehicle. Reads as a lit studio floor and keeps
          the frame from looking empty while a placeholder is in place. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 bottom-0 h-1/3 rounded-[50%] bg-brand/12 blur-2xl"
      />

      {failed ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
          <ImageOff
            aria-hidden="true"
            className="size-5 shrink-0 text-subtle-foreground"
          />
          <span className="text-xs font-medium text-muted-foreground">
            {alt || "Vehicle image"}
          </span>
          <span className="text-[0.65rem] text-subtle-foreground">
            Image not available yet
          </span>
        </div>
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          loading={priority ? undefined : "lazy"}
          onError={() => setFailedSrc(src)}
          className={cn("object-cover", imageClassName)}
        />
      )}
    </div>
  );
}

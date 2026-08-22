import Link from "next/link";
import { Compass, Home } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

/** 404. Offers the two destinations that are actually useful from a dead end. */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-9 px-5 py-20 text-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="grid-field mask-fade-b absolute inset-0 opacity-50" />
        <div className="absolute -top-32 left-1/2 h-96 w-[40rem] -translate-x-1/2 rounded-full bg-brand-surface blur-3xl" />
      </div>

      <Logo size="md" />

      <div className="flex max-w-lg flex-col gap-4">
        <p data-numeric className="text-5xl font-medium text-brand-gradient">
          404
        </p>
        <h1 className="text-2xl font-medium sm:text-3xl">Page not found</h1>
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
          The page you asked for doesn&apos;t exist, or it may have moved.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild variant="accent" size="md">
          <Link href="/">
            <Home />
            Back to home
          </Link>
        </Button>
        <Button asChild variant="hairline" size="md">
          <Link href="/#investment-plans">
            <Compass />
            Investment plans
          </Link>
        </Button>
      </div>
    </div>
  );
}

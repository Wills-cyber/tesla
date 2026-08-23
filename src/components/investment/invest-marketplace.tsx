"use client";

import * as React from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { InvestmentPlanCard } from "@/components/investment/investment-plan-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { InvestmentPlan } from "@/types/investment";

/**
 * Availability filter.
 *
 * `available` means "can actually be entered", which is `status === "open"` and
 * nothing else. A plan that is closed or fully allocated is not available, and
 * lumping it in with open plans would be the kind of shortcut that gets someone
 * clicking Start Investment on a plan that cannot take capital.
 */
type Availability = "all" | "coming_soon" | "available";

/** Ordering. `featured` is the default and puts the introductory plan first. */
type SortKey = "featured" | "amount-asc" | "amount-desc";

const AVAILABILITY_OPTIONS: readonly { key: Availability; label: string }[] = [
  { key: "all", label: "All" },
  { key: "coming_soon", label: "Coming Soon" },
  { key: "available", label: "Available" },
];

const SORT_OPTIONS: readonly { key: SortKey; label: string }[] = [
  { key: "featured", label: "Featured" },
  { key: "amount-asc", label: "Lower Investment" },
  { key: "amount-desc", label: "Higher Investment" },
];

function matchesAvailability(plan: InvestmentPlan, filter: Availability): boolean {
  if (filter === "all") return true;
  if (filter === "coming_soon") return plan.status === "coming_soon";
  return plan.status === "open";
}

/**
 * The investment marketplace.
 *
 * Entirely driven by the `plans` prop, which comes from the `investment_plans`
 * table (falling back to the pre-launch catalogue only when the backend is
 * unconfigured). No plan figure, name or image path is written in this file —
 * publishing a plan is inserting a row.
 *
 * The filter area is deliberately one row of chips plus one row of sort chips.
 * There are five plans; a faceted search rig would be more chrome than catalogue,
 * and the cards are what the page is for. Search only appears once there are
 * enough plans for scanning to be the slower option.
 *
 * Filtering is client-side because the whole catalogue is small enough to send at
 * once. When it isn't, this becomes URL search params and a server query, with no
 * change to the card or the page around it.
 *
 * Nothing here creates, owns or activates an investment. This page lists what is
 * *published*; `/investments` lists what the signed-in user actually holds.
 */
export function InvestMarketplace({
  plans,
}: {
  plans: readonly InvestmentPlan[];
}) {
  const [query, setQuery] = React.useState("");
  const [availability, setAvailability] = React.useState<Availability>("all");
  const [sort, setSort] = React.useState<SortKey>("featured");

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();

    const matched = plans.filter((plan) => {
      if (!matchesAvailability(plan, availability)) return false;
      if (!needle) return true;

      return (
        plan.name.toLowerCase().includes(needle) ||
        plan.summary.toLowerCase().includes(needle) ||
        plan.vehicleModel.toLowerCase().includes(needle) ||
        plan.vehicleType.toLowerCase().includes(needle)
      );
    });

    const sorted = [...matched];
    switch (sort) {
      case "amount-asc":
        sorted.sort((a, b) => a.investmentAmountCents - b.investmentAmountCents);
        break;
      case "amount-desc":
        sorted.sort((a, b) => b.investmentAmountCents - a.investmentAmountCents);
        break;
      default:
        // Featured first, then by entry amount ascending — so the order reads as
        // a ladder from the introductory plan upward rather than arbitrarily.
        sorted.sort(
          (a, b) =>
            Number(Boolean(b.featured)) - Number(Boolean(a.featured)) ||
            a.investmentAmountCents - b.investmentAmountCents
        );
    }

    return sorted;
  }, [plans, query, availability, sort]);

  const hasFilters =
    Boolean(query) || availability !== "all" || sort !== "featured";

  function clearFilters() {
    setQuery("");
    setAvailability("all");
    setSort("featured");
  }

  // Search only earns its space once scanning the grid is the slower option.
  const showSearch = plans.length > 6;

  return (
    <div className="flex flex-col gap-6">
      {plans.length > 1 && (
        <div className="panel flex flex-col gap-4 p-4 sm:p-5">
          {showSearch && (
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search plans by name or vehicle"
                aria-label="Search investment plans"
              />
            </div>
          )}

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
            <FilterRow label="Availability">
              {AVAILABILITY_OPTIONS.map((option) => (
                <Chip
                  key={option.key}
                  active={availability === option.key}
                  onClick={() => setAvailability(option.key)}
                >
                  {option.label}
                </Chip>
              ))}
            </FilterRow>

            <FilterRow label="Sort by" icon>
              {SORT_OPTIONS.map((option) => (
                <Chip
                  key={option.key}
                  active={sort === option.key}
                  onClick={() => setSort(option.key)}
                >
                  {option.label}
                </Chip>
              ))}
            </FilterRow>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p aria-live="polite" className="text-sm text-muted-foreground">
          <span data-numeric className="font-semibold text-foreground">
            {filtered.length}
          </span>{" "}
          {filtered.length === 1 ? "plan" : "plans"}
          {filtered.length !== plans.length && (
            <>
              {" "}
              of{" "}
              <span data-numeric className="font-semibold text-foreground">
                {plans.length}
              </span>
            </>
          )}
          {filtered.length > 0 && (
            <>
              {" · from "}
              <span data-numeric className="font-semibold text-foreground">
                {formatCurrency(
                  Math.min(...filtered.map((plan) => plan.investmentAmountCents)),
                  { compactDecimals: true }
                )}
              </span>
            </>
          )}
        </p>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X />
            Clear filters
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title={plans.length === 0 ? "No plans published" : "No plans match"}
          description={
            plans.length === 0
              ? "There are no investment plans available right now. New plans appear here as soon as they are published."
              : availability === "available"
                ? "No plan is open for investment yet. Every published plan is currently Coming Soon."
                : "Nothing matches the current search and filters."
          }
          action={
            hasFilters ? (
              <Button variant="hairline" size="md" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        /* One column on phones, two from 640px, three from 1280px. The grid uses
           `minmax(0, 1fr)` implicitly via Tailwind's grid-cols, so a long plan
           name wraps instead of forcing the row wider — no horizontal scroll at
           any width.

           Deliberately NOT wrapped in `RevealGroup`. These cards are the entire
           point of the page and they are on screen the moment it opens, so their
           visibility must not depend on a scroll observer firing, on hydration
           completing, or on Motion running at all. The entrance below is pure CSS:
           it starts on its own, and if the stylesheet never applied the cards
           would simply be visible with no animation. A JS-driven `opacity: 0`
           start state can fail in the other direction — invisible content — which
           is what a percentage-threshold scroll reveal did to this grid before. */
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
          {filtered.map((plan, index) => (
            <div
              key={plan.id}
              className="flex animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out"
              style={{
                // A short stagger, capped so no card waits long enough to read as
                // missing. `animate-in` holds the start state during the delay.
                animationDelay: `${Math.min(index, 5) * 50}ms`,
              }}
            >
              <InvestmentPlanCard
                plan={plan}
                animate={false}
                priority={index === 0}
                className="w-full"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterRow({
  label,
  icon = false,
  children,
}: {
  label: string;
  icon?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className="flex items-center gap-1.5 text-[0.68rem] font-medium tracking-[0.14em] text-muted-foreground uppercase">
        {icon && <SlidersHorizontal aria-hidden="true" className="size-3" />}
        {label}
      </span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-all duration-300",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        active
          ? "border-brand-border bg-brand-surface text-brand-emphasis shadow-soft"
          : "border-hairline bg-surface-1 text-muted-foreground hover:border-hairline-strong hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

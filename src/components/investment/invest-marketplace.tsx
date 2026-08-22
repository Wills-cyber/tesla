"use client";

import * as React from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { InvestmentPlanCard } from "@/components/investment/investment-plan-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RevealGroup, RevealItem } from "@/components/common/reveal";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { InvestmentPlan, PlanStatus } from "@/types/investment";

type SortKey = "featured" | "amount-asc" | "amount-desc" | "duration-asc";

const SORT_OPTIONS: readonly { key: SortKey; label: string }[] = [
  { key: "featured", label: "Featured" },
  { key: "amount-asc", label: "Lowest entry" },
  { key: "amount-desc", label: "Highest entry" },
  { key: "duration-asc", label: "Shortest term" },
];

const STATUS_LABELS: Record<PlanStatus, string> = {
  open: "Open",
  coming_soon: "Coming soon",
  closed: "Closed",
  sold_out: "Fully allocated",
};

/**
 * The investment marketplace.
 *
 * Entirely driven by the `plans` prop, which comes from the `investment_plans`
 * table (falling back to the pre-launch catalogue only when the backend is
 * unconfigured). Nothing about a plan is hard-coded here — the vehicle-type and
 * status filters are *derived from the data*, so inserting a row with a new vehicle
 * type makes a new filter chip appear without touching this file.
 *
 * Filtering happens client-side because the whole catalogue is small enough to send
 * at once; when it isn't, this becomes URL search params and a server query with no
 * change to the card or the page around it.
 */
export function InvestMarketplace({
  plans,
}: {
  plans: readonly InvestmentPlan[];
}) {
  const [query, setQuery] = React.useState("");
  const [vehicleType, setVehicleType] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<PlanStatus | null>(null);
  const [sort, setSort] = React.useState<SortKey>("featured");

  // Facets derived from the data, so new plan types need no code change.
  const vehicleTypes = React.useMemo(
    () => [...new Set(plans.map((plan) => plan.vehicleType))].sort(),
    [plans]
  );

  const statuses = React.useMemo(
    () => [...new Set(plans.map((plan) => plan.status))],
    [plans]
  );

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();

    const matched = plans.filter((plan) => {
      if (vehicleType && plan.vehicleType !== vehicleType) return false;
      if (status && plan.status !== status) return false;
      if (!needle) return true;

      return (
        plan.name.toLowerCase().includes(needle) ||
        plan.summary.toLowerCase().includes(needle) ||
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
      case "duration-asc":
        sorted.sort((a, b) => a.durationDays - b.durationDays);
        break;
      default:
        sorted.sort(
          (a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured))
        );
    }

    return sorted;
  }, [plans, query, vehicleType, status, sort]);

  const hasFilters = Boolean(query || vehicleType || status) || sort !== "featured";

  function clearFilters() {
    setQuery("");
    setVehicleType(null);
    setStatus(null);
    setSort("featured");
  }

  // Search and status filters only earn their space once there's a range to narrow.
  const showSearch = plans.length > 3;
  const showFacets = vehicleTypes.length > 1 || statuses.length > 1;

  return (
    <div className="flex flex-col gap-7">
      {(showSearch || showFacets) && (
        <div className="panel flex flex-col gap-5 p-5">
          {showSearch && (
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search plans by name, summary or vehicle type"
                aria-label="Search investment plans"
                className="pl-10"
              />
            </div>
          )}

          {showFacets && (
            <div className="flex flex-col gap-4">
              {vehicleTypes.length > 1 && (
                <FilterRow label="Vehicle type">
                  <Chip
                    active={vehicleType === null}
                    onClick={() => setVehicleType(null)}
                  >
                    All
                  </Chip>
                  {vehicleTypes.map((type) => (
                    <Chip
                      key={type}
                      active={vehicleType === type}
                      onClick={() =>
                        setVehicleType(vehicleType === type ? null : type)
                      }
                    >
                      {type}
                    </Chip>
                  ))}
                </FilterRow>
              )}

              {statuses.length > 1 && (
                <FilterRow label="Availability">
                  <Chip active={status === null} onClick={() => setStatus(null)}>
                    All
                  </Chip>
                  {statuses.map((value) => (
                    <Chip
                      key={value}
                      active={status === value}
                      onClick={() => setStatus(status === value ? null : value)}
                    >
                      {STATUS_LABELS[value]}
                    </Chip>
                  ))}
                </FilterRow>
              )}

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
          )}
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
        <RevealGroup
          className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3"
          stagger={0.06}
        >
          {filtered.map((plan) => (
            <RevealItem key={plan.id} className="flex">
              <InvestmentPlanCard plan={plan} animate={false} className="w-full" />
            </RevealItem>
          ))}
        </RevealGroup>
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
    <div className="flex flex-col gap-2">
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
        "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-300",
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

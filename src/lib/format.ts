/**
 * Formatting helpers.
 *
 * Money is stored and passed around in minor units (cents) so nothing is ever
 * lost to floating-point drift. Convert to a display string only at the edge.
 */

const CENTS_PER_UNIT = 100;

export function centsToUnits(cents: number): number {
  return cents / CENTS_PER_UNIT;
}

export function unitsToCents(units: number): number {
  return Math.round(units * CENTS_PER_UNIT);
}

type CurrencyOptions = {
  currency?: string;
  locale?: string;
  /** Drop `.00` on whole amounts. Useful for large marketing figures. */
  compactDecimals?: boolean;
  /** Render a leading `+` for positive amounts. */
  signed?: boolean;
};

export function formatCurrency(
  cents: number,
  {
    currency = "USD",
    locale = "en-US",
    compactDecimals = false,
    signed = false,
  }: CurrencyOptions = {}
): string {
  const units = centsToUnits(cents);
  const hasFraction = Math.abs(cents) % CENTS_PER_UNIT !== 0;
  const fractionDigits = compactDecimals && !hasFraction ? 0 : 2;

  const formatted = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(Math.abs(units));

  if (cents < 0) return `-${formatted}`;
  if (signed && cents > 0) return `+${formatted}`;
  return formatted;
}

export function formatNumber(value: number, locale = "en-US"): string {
  return new Intl.NumberFormat(locale).format(value);
}

export function formatPercent(
  ratio: number,
  { locale = "en-US", digits = 1 }: { locale?: string; digits?: number } = {}
): string {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(ratio);
}

export function formatDuration(days: number): string {
  if (days % 7 === 0 && days >= 7) {
    const weeks = days / 7;
    return `${days} Days · ${weeks} ${weeks === 1 ? "Week" : "Weeks"}`;
  }
  return `${days} ${days === 1 ? "Day" : "Days"}`;
}

export function formatDate(
  value: string | Date | null | undefined,
  {
    locale = "en-US",
    style = "medium",
  }: { locale?: string; style?: "short" | "medium" | "long" } = {}
): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(locale, {
    dateStyle: style,
  }).format(date);
}

export function formatDateTime(
  value: string | Date | null | undefined,
  locale = "en-US"
): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/** "3 days ago" / "in 2 weeks". Falls back to an absolute date past a year. */
export function formatRelativeTime(
  value: string | Date,
  now: Date = new Date(),
  locale = "en-US"
): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";

  const diffMs = date.getTime() - now.getTime();
  const diffSeconds = Math.round(diffMs / 1000);
  const absSeconds = Math.abs(diffSeconds);

  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  const thresholds: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["second", 60],
    ["minute", 3600],
    ["hour", 86_400],
    ["day", 604_800],
    ["week", 2_629_800],
    ["month", 31_557_600],
  ];

  const divisors: Record<string, number> = {
    second: 1,
    minute: 60,
    hour: 3600,
    day: 86_400,
    week: 604_800,
    month: 2_629_800,
  };

  for (const [unit, limit] of thresholds) {
    if (absSeconds < limit) {
      return formatter.format(Math.round(diffSeconds / divisors[unit]), unit);
    }
  }

  return formatDate(date, { locale });
}

export function getInitials(name: string | null | undefined): string {
  if (!name?.trim()) return "—";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

/** `abcdef12-…` → `abcdef12` for compact reference display. */
export function shortReference(reference: string, length = 8): string {
  return reference.replace(/-/g, "").slice(0, length).toUpperCase();
}

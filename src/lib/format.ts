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

/**
 * `DD/MM/YYYY`.
 *
 * Used on receipts, where the date is a record rather than prose and a fixed,
 * unambiguous, zero-padded form is what a reader forwarding the document to
 * support expects. Built from the parts rather than a locale `dateStyle` so it is
 * this format on every machine — `en-US` would render `08/23/2026`.
 */
export function formatDateNumeric(
  value: string | Date | null | undefined
): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
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

/**
 * Formats a crypto amount for display.
 *
 * Takes the decimal *string* the provider returned — never a number, so no rate ever
 * passes through a float — and truncates rather than rounds to the asset's display
 * precision. Truncating means a shown amount is never larger than the amount that
 * exists, which is the safe direction to be wrong in.
 *
 * Tolerant of a `number` at runtime despite the declared type. Postgres `numeric`
 * columns arrive from PostgREST as JSON numbers, and a display helper is the wrong
 * place to discover that: throwing here takes down the whole list it was rendering.
 * The mapping layer normalises with `toDecimalString`; this coerces defensively so
 * a missed spot degrades to a dash instead of an error boundary.
 */
export function formatAssetAmount(
  amount: string | number | null | undefined,
  displayDecimals: number
): string {
  if (amount === null || amount === undefined) return "—";

  const text = typeof amount === "string" ? amount : String(amount);
  // Exponential notation has no whole/fraction split to take, so it is not a
  // string this function can format honestly.
  if (!/^-?\d+(\.\d+)?$/.test(text.trim())) return "—";

  const [whole, fraction = ""] = text.trim().split(".");
  if (displayDecimals === 0) return whole;
  const padded = fraction.padEnd(displayDecimals, "0").slice(0, displayDecimals);
  return `${whole}.${padded}`;
}

/** `T9yD…KcbLSE` — enough to compare against a wallet without a wall of text. */
export function shortenHash(value: string, lead = 6, tail = 6): string {
  if (value.length <= lead + tail + 1) return value;
  return `${value.slice(0, lead)}…${value.slice(-tail)}`;
}


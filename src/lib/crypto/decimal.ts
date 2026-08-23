/**
 * Exact decimal arithmetic on strings.
 *
 * Rates and on-chain amounts arrive from providers as decimal strings, and the
 * one thing this codebase will not do is put them through a float. `0.1 + 0.2`
 * is the classic demonstration; the version that matters here is that a rate with
 * 18 decimal places, multiplied by an amount and rounded to cents, can land a
 * cent away from what the payout rail computed — and a cent of drift in a money
 * figure is a support ticket that starts "your maths is wrong".
 *
 * So everything below decomposes a decimal string into an exact integer and a
 * scale, works in `BigInt`, and only produces a `number` at the very end, when the
 * value is already an integer count of cents.
 *
 * Every function returns `null` for input it cannot represent exactly, rather
 * than a best guess. A caller that gets `null` must show "unavailable" — which is
 * the honest thing to show when a number could not be derived.
 */

const DECIMAL_PATTERN = /^-?\d+(\.\d+)?$/;

type Decimal = {
  /** The digits with the point removed, signed. */
  units: bigint;
  /** How many of those digits sit after the point. */
  scale: number;
};

/** `"1.005"` → `{ units: 1005n, scale: 3 }`. `null` if not a plain decimal. */
export function parseDecimal(value: string): Decimal | null {
  const trimmed = value.trim();
  if (!DECIMAL_PATTERN.test(trimmed)) return null;

  const negative = trimmed.startsWith("-");
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [whole, fraction = ""] = unsigned.split(".");

  try {
    const units = BigInt(`${whole}${fraction}`);
    return { units: negative ? -units : units, scale: fraction.length };
  } catch {
    return null;
  }
}

/**
 * Which way a value is rounded when it lands between two cents.
 *
 * Not a stylistic choice. Each caller picks the direction that cannot flatter a
 * figure at the user's expense:
 *
 *   · `up`   — anything the user is *charged*. A fee shown lower than the fee
 *              taken is a number the confirmation screen got wrong. This also
 *              matches `ceil()` in `request_withdrawal`, so the client and the
 *              database agree to the cent.
 *   · `down` — anything the user *receives*. A receive amount is never rendered
 *              larger than the amount that will exist.
 *   · `nearest` — neutral valuations that are neither charged nor received.
 */
export type Rounding = "up" | "down" | "nearest";

/** Rounds `units / 10^scale` to an integer in the requested direction. */
function roundToInteger(
  { units, scale }: Decimal,
  mode: Rounding = "nearest"
): bigint {
  if (scale === 0) return units;

  const divisor = 10n ** BigInt(scale);
  const negative = units < 0n;
  const magnitude = negative ? -units : units;

  const quotient = magnitude / divisor;
  const remainder = magnitude % divisor;

  if (remainder === 0n) return negative ? -quotient : quotient;

  // `up` and `down` are away from and toward zero respectively. Every amount
  // this module handles is a magnitude, so that is the intuitive reading.
  const rounded =
    mode === "up"
      ? quotient + 1n
      : mode === "down"
        ? quotient
        : remainder * 2n >= divisor
          ? quotient + 1n
          : quotient;

  return negative ? -rounded : rounded;
}

/**
 * `assetAmount × usdPerUnit`, in USD cents.
 *
 * The product is formed exactly and only then rounded, so a rate carrying 18
 * decimals contributes no error of its own. The caller states the rounding
 * direction because there is no single safe default — see `Rounding`.
 */
export function decimalProductToCents(
  amount: string,
  usdPerUnit: string,
  mode: Rounding = "nearest"
): number | null {
  const left = parseDecimal(amount);
  const right = parseDecimal(usdPerUnit);
  if (!left || !right) return null;

  // × 100 to land in cents, applied to the exact product before rounding.
  const cents = roundToInteger(
    {
      units: left.units * right.units * 100n,
      scale: left.scale + right.scale,
    },
    mode
  );

  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return Number(cents);
}

/**
 * Normalises a value from a Postgres `numeric` column into a decimal string.
 *
 * PostgREST serialises `numeric` as a JSON *number*, not a string — so a column
 * typed `string | null` in the generated types arrives as a `number` at runtime.
 * That mismatch is invisible until something calls a string method on it, at which
 * point the render throws and takes the whole page down.
 *
 * So every `numeric` column is passed through here at the mapping boundary,
 * once, rather than each consumer guessing. Callers downstream can then rely on
 * having a string, which is what the "decimal strings, never floats" rule in this
 * module assumes.
 *
 * Exponential notation is rejected rather than expanded: `1e-7` is a shape no
 * amount in this system legitimately takes, and quietly reinterpreting it would be
 * a guess about a money figure. `null` means "no usable value", and callers render
 * an unavailable state.
 *
 * Note the precision caveat this cannot fix: by the time a `numeric(38,18)` has
 * been through JSON as a double, digits beyond ~15 significant figures are already
 * gone. Preserving them requires asking Postgres for text in the first place —
 * `select=col::text` — which is why the withdrawal queries do exactly that. This
 * function is the safety net for anything that doesn't.
 */
export function toDecimalString(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    return DECIMAL_PATTERN.test(trimmed) ? trimmed : null;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    const asString = String(value);
    // `String(1e-7)` is `"1e-7"`, which is not a plain decimal.
    return DECIMAL_PATTERN.test(asString) ? asString : null;
  }

  // bigint, boolean, object — nothing that should reach a numeric column.
  return null;
}

/**
 * `usdCents` worth of an asset priced at `usdPerUnit`, to `decimals` places.
 *
 * The inverse of `decimalProductToCents`, and the direction a withdrawal needs:
 * "how much USDT is $500". Formed as one exact `BigInt` division so the rate never
 * touches a float —
 *
 *     units = usdCents · 10^rateScale · 10^decimals / (100 · rateUnits)
 *
 * Truncated rather than rounded, deliberately. This figure is shown as what the
 * user *receives*, and rounding up would promise a fraction more than the amount
 * paid for. Truncation can only ever under-state by one unit at the asset's
 * smallest denomination.
 *
 * `null` for a rate of zero, a malformed decimal, or a result too large to be safe
 * — callers must render "unavailable" rather than substitute a guess.
 */
export function centsToAssetUnits(
  usdCents: number,
  usdPerUnit: string,
  decimals: number
): string | null {
  if (!Number.isInteger(usdCents) || usdCents < 0) return null;
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) return null;

  const rate = parseDecimal(usdPerUnit);
  if (!rate || rate.units <= 0n) return null;

  const numerator =
    BigInt(usdCents) * 10n ** BigInt(rate.scale) * 10n ** BigInt(decimals);
  const denominator = 100n * rate.units;

  const units = numerator / denominator;
  if (units > BigInt(Number.MAX_SAFE_INTEGER) * 10n ** BigInt(decimals)) {
    return null;
  }

  return formatUnits(units, decimals);
}

/**
 * `a - b` as a decimal string, keeping the wider of the two scales.
 *
 * Used to take a network fee off a gross asset amount. Clamped at zero: a fee
 * larger than the amount means nothing arrives, and a negative "you receive" is
 * never a truthful thing to render.
 */
export function subtractDecimals(a: string, b: string): string | null {
  const left = parseDecimal(a);
  const right = parseDecimal(b);
  if (!left || !right) return null;

  const scale = Math.max(left.scale, right.scale);
  const lift = (value: Decimal) =>
    value.units * 10n ** BigInt(scale - value.scale);

  const difference = lift(left) - lift(right);
  const clamped = difference < 0n ? 0n : difference;

  return formatUnits(clamped, scale);
}

/** `{ 1005n, 3 }` → `"1.005"`. */
function formatUnits(units: bigint, scale: number): string {
  if (scale === 0) return units.toString();

  const negative = units < 0n;
  const digits = (negative ? -units : units).toString().padStart(scale + 1, "0");
  const whole = digits.slice(0, digits.length - scale);
  const fraction = digits.slice(digits.length - scale);

  return `${negative ? "-" : ""}${whole}.${fraction}`;
}

/**
 * Applies a basis-point fee to a cent amount, rounding up.
 *
 * Rounding up matches `request_withdrawal` in the database exactly — the figure
 * shown before confirming has to be the figure charged, and "off by one cent
 * because the client rounded the other way" is not an acceptable difference on a
 * confirmation screen.
 */
export function applyBasisPoints(cents: number, bps: number): number {
  if (bps <= 0) return 0;
  return Math.ceil((cents * bps) / 10_000);
}

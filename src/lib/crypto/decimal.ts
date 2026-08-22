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

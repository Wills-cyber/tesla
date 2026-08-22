/**
 * Theme registry.
 *
 * The *values* of every colour, radius and shadow live in one place —
 * `src/app/globals.css` — as CSS custom properties. This module is the
 * TypeScript-side contract for the parts the app has to reason about at
 * runtime: which themes exist, which one is the default, and where the user's
 * preference is stored.
 *
 * To restyle the product globally, edit the token blocks in `globals.css`.
 * No component hard-codes a colour: they consume semantic classes
 * (`bg-surface-2`, `text-brand-emphasis`, `border-hairline`, `shadow-card`)
 * which resolve through those tokens, so a single edit moves the whole UI.
 */

export const THEMES = ["light", "dark"] as const;

export type Theme = (typeof THEMES)[number];

/** Light is the product's primary experience. Dark is an opt-in preference. */
export const DEFAULT_THEME: Theme = "light";

/**
 * localStorage key for the theme preference.
 *
 * This is the only thing the app persists client-side, and it is a display
 * preference — never financial state. Balances, investments and transactions
 * are read from the server on every request.
 */
export const THEME_STORAGE_KEY = "tesla-electronics-theme";

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

/**
 * Browser theme-colour per theme, used by `generateViewport` so the mobile
 * browser chrome matches the surface behind it.
 */
export const THEME_COLORS: Record<Theme, string> = {
  light: "#faf9f6",
  dark: "#0a0b0d",
};

/**
 * Semantic token reference.
 *
 * Kept as documentation rather than as values so there is exactly one source of
 * truth. Each entry names the Tailwind utility a component should reach for.
 */
export const TOKEN_GUIDE = {
  surfaces: [
    "bg-background — the page. Warm ivory in light, near-black in dark.",
    "bg-surface-1 — raised card. Pure white in light.",
    "bg-surface-2 — soft section band, subtle fills, table headers.",
    "bg-surface-3 — sunken wells, inputs, code/address blocks.",
  ],
  text: [
    "text-foreground — charcoal headings and primary copy.",
    "text-muted-foreground — secondary copy (AA on every surface).",
    "text-subtle-foreground — tertiary metadata only, never body copy.",
  ],
  brand: [
    "text-brand-emphasis — gold text, contrast-checked for body sizes.",
    "text-brand / bg-brand — metallic gold for icons, indicators, fills.",
    "bg-brand-surface — faint gold wash behind an accent block.",
    "border-brand-border — gold hairline.",
    "text-brand-contrast — the ink placed on top of solid gold.",
  ],
  lines: [
    "border-hairline — the default 1px rule.",
    "border-hairline-strong — a deliberate, heavier separation.",
  ],
  elevation: [
    "shadow-soft — barely there; hover affordance.",
    "shadow-card — resting card.",
    "shadow-lift — hovered card, popover.",
    "shadow-float — floating navigation, modal.",
  ],
} as const;

/**
 * One-off light-theme class sweep.
 *
 * The dark theme encoded its surfaces as white-alpha washes (`border-white/10`,
 * `bg-white/[0.03]`) and its accent as raw scale steps (`text-gold-300`). Neither
 * survives a light background, and neither can be re-themed later.
 *
 * This rewrites them to the semantic tokens in `globals.css`, so both palettes
 * resolve from the same class names and a future restyle is a token edit.
 *
 * Files listed in SKIP are excluded because their dark values are deliberate: the
 * inverse wallet panel, the QR code's mandatory white quiet zone, the brand mark's
 * gradient stops and the gold CTA gradient.
 *
 *   node scripts/sweep-theme-classes.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SKIP = new Set([
  "src/components/wallet/wallet-card.tsx",
  "src/components/wallet/qr-code.tsx",
  "src/components/brand/logo.tsx",
  "src/components/brand/branded-loader.tsx",
  "src/components/ui/button.tsx",
]);

/** Ordered: longer, more specific patterns first so they win. */
const REPLACEMENTS = [
  // --- the removed `.surface` component class -------------------------------
  ['className="surface ', 'className="bg-surface-1 shadow-card '],
  ["group/feature surface ", "group/feature bg-surface-1 shadow-card "],
  ["surface group/card ", "bg-surface-1 shadow-card group/card "],

  // --- gold accent -> semantic brand ---------------------------------------
  ["group-hover/feature:border-gold-500/25", "group-hover/feature:border-brand-border"],
  ["group-hover/feature:bg-gold-500/8", "group-hover/feature:bg-brand-surface"],
  ["group-hover/step:border-gold-500/25", "group-hover/step:border-brand-border"],
  ["group-hover/step:bg-gold-500/8", "group-hover/step:bg-brand-surface"],
  ["group-hover/step:text-gold-500/70", "group-hover/step:text-brand"],
  ["hover:border-gold-500/25", "hover:border-brand-border"],
  ["hover:decoration-gold-400", "hover:decoration-brand"],
  ["decoration-gold-500/40", "decoration-brand/45"],
  ["data-[state=checked]:border-gold-500", "data-[state=checked]:border-primary"],
  ["data-[state=checked]:bg-gold-500", "data-[state=checked]:bg-primary"],
  ["border-gold-500/20", "border-brand-border"],
  ["border-gold-500/25", "border-brand-border"],
  ["border-gold-500/30", "border-brand-border"],
  ["border-gold-500/40", "border-brand-border"],
  ["bg-gold-500/[0.045]", "bg-brand-surface"],
  ["bg-gold-500/8", "bg-brand-surface"],
  ["bg-gold-500/10", "bg-brand-surface"],
  ["bg-gold-500/12", "bg-brand-surface-strong"],
  ["text-gold-gradient", "text-brand-gradient"],
  ["text-gold-100/85", "text-foreground"],
  ["text-gold-100", "text-foreground"],
  ["text-gold-200", "text-brand-emphasis"],
  ["text-gold-300", "text-brand"],
  ["bg-gold-400", "bg-brand"],
  ["bg-gold-500", "bg-brand"],
  ["outline-gold-500/70", "outline-brand"],
  ["focus-visible:ring-gold-500/20", "focus-visible:ring-ring/25"],
  ["focus-visible:border-gold-500/50", "focus-visible:border-brand/60"],

  // --- white-alpha surfaces -> tokens --------------------------------------
  ["hover:bg-white/[0.02]", "hover:bg-surface-2"],
  ["focus-visible:bg-white/[0.02]", "focus-visible:bg-surface-2"],
  ["hover:border-white/25", "hover:border-hairline-strong"],
  ["hover:border-white/20", "hover:border-hairline-strong"],
  ["bg-white/[0.035]", "bg-surface-2"],
  ["bg-white/[0.03]", "bg-surface-2"],
  ["bg-white/[0.02]", "bg-surface-2"],
  ["bg-white/[0.015]", "bg-surface-2"],
  ["bg-white/[0.012]", "bg-surface-2"],
  ["bg-white/15", "bg-hairline-strong"],
  ["bg-white/10", "bg-surface-3"],
  ["bg-white/6", "bg-hairline"],
  ["text-white/12", "text-hairline-strong"],
  ["border-white/25", "border-hairline-strong"],
  ["border-white/20", "border-hairline-strong"],
  ["border-white/14", "border-hairline"],
  ["border-white/12", "border-hairline"],
  ["border-white/10", "border-hairline"],
  ["border-white/8", "border-hairline"],
  ["border-white/6", "border-hairline"],
  ["divide-white/6", "divide-hairline"],
  ["divide-white/8", "divide-hairline"],

  // --- near-black surfaces -> tokens ---------------------------------------
  ["bg-ink-950/95", "bg-popover/95"],
  ["hover:bg-ink-900/70", "hover:bg-surface-2"],
  ["hover:bg-ink-900/60", "hover:bg-surface-2"],
  ["bg-ink-900/60", "bg-surface-2"],
  ["bg-ink-950/60", "bg-surface-1"],
  ["bg-ink-950", "bg-surface-1"],

  // --- status colours -> semantic tokens -----------------------------------
  ["border-amber-400/25", "border-warning/25"],
  ["border-amber-400/20", "border-warning/25"],
  ["bg-amber-400/[0.04]", "bg-warning-surface"],
  ["bg-amber-400/8", "bg-warning-surface"],
  ["text-amber-200/90", "text-warning"],
  ["text-amber-200", "text-warning"],
  ["text-amber-100", "text-foreground"],
  ["border-emerald-400/25", "border-success/25"],
  ["bg-emerald-400/8", "bg-success-surface"],
  ["bg-emerald-400/[0.06]", "bg-success-surface"],
  ["text-emerald-300", "text-success"],
  ["text-emerald-200", "text-success"],
  ["text-emerald-100", "text-foreground"],
  ["bg-destructive/[0.06]", "bg-destructive-surface"],
  ["text-red-200", "text-destructive"],
  ["text-red-100", "text-foreground"],

  // --- muted-foreground opacity steps -> the tertiary token ---------------
  ["text-muted-foreground/50", "text-subtle-foreground"],
  ["text-muted-foreground/60", "text-subtle-foreground"],
  ["text-muted-foreground/65", "text-subtle-foreground"],
  ["text-muted-foreground/70", "text-subtle-foreground"],
  ["text-muted-foreground/75", "text-subtle-foreground"],
  ["text-muted-foreground/80", "text-muted-foreground"],
];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else if (/\.tsx?$/.test(entry)) out.push(path);
  }
  return out;
}

let changedFiles = 0;
let totalEdits = 0;

for (const path of walk("src")) {
  const normalised = path.split("\\").join("/");
  if (SKIP.has(normalised)) continue;

  const original = readFileSync(path, "utf8");
  let next = original;
  let edits = 0;

  for (const [from, to] of REPLACEMENTS) {
    const parts = next.split(from);
    if (parts.length > 1) {
      edits += parts.length - 1;
      next = parts.join(to);
    }
  }

  if (next !== original) {
    writeFileSync(path, next);
    changedFiles += 1;
    totalEdits += edits;
    console.log(`${normalised}  (${edits})`);
  }
}

console.log(`\n${totalEdits} replacements across ${changedFiles} files.`);

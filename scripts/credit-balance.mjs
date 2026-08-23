/**
 * Credits a user's available balance.
 *
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/credit-balance.mjs <user-id> <usd>
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/credit-balance.mjs c783e7e8-... 50000
 *
 * Add --dry-run to inspect the current balance and the intended change without
 * writing anything.
 *
 * ---------------------------------------------------------------------------
 * Writes the ledger, never the balance
 * ---------------------------------------------------------------------------
 * `user_balances` is a derived table. `recalculate_user_balance()` recomputes it
 * from `transactions`, and a trigger runs that after every write to the ledger. So
 * setting `available_cents` directly would hold until the user's next transaction
 * and then silently revert. This inserts the ledger row instead and reads the
 * balance back to confirm the trigger did its job.
 *
 * The row is typed `adjustment`, not `deposit`: no funds were received from the
 * user, and `adjustment` is what the schema provides for an operator correction.
 * It also lands only in `available_cents`, so the credit never shows up as profit
 * the platform claims to have produced.
 *
 * ---------------------------------------------------------------------------
 * Why the service-role key
 * ---------------------------------------------------------------------------
 * RLS grants clients no INSERT on `transactions` by design, so the anon key
 * cannot do this — that is the schema working, not an obstacle to route around.
 * The key is read from the environment and never written to disk. If you would
 * rather not put it in a shell, run `scripts/credit-user-balance.sql` in the
 * Supabase SQL editor instead; it does the same thing with the same guards.
 *
 * Re-running is safe: the reference is derived from the user and amount, and
 * `transactions_reference_unique` plus an explicit pre-check mean a second run
 * credits nothing.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(import.meta.dirname, "..");

/* ------------------------------------------------------------------- inputs */

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const positional = args.filter((a) => !a.startsWith("--"));

const [userId, usdArg] = positional;

function fail(message) {
  console.error(`\n  ✗ ${message}\n`);
  process.exit(1);
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

if (!userId || !usdArg) {
  fail(
    "Usage: SUPABASE_SERVICE_ROLE_KEY=... node scripts/credit-balance.mjs <user-id> <usd> [--dry-run]"
  );
}
if (!UUID_RE.test(userId)) {
  fail(`"${userId}" is not a uuid. Pass the user's profile id.`);
}

/**
 * Parsed as a decimal string, not with `Number`, so money never touches binary
 * floating point. `50000.10` becomes exactly 5000010 cents; via `parseFloat` it
 * could land a cent out.
 */
function usdToCents(input) {
  const cleaned = input.replace(/[$,_]/g, "").trim();
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!match) {
    fail(
      `"${input}" is not a USD amount. Use e.g. 50000 or 1234.56 (at most 2 decimal places).`
    );
  }
  const [, sign, whole, frac = ""] = match;
  const cents =
    BigInt(whole) * 100n + BigInt(frac.padEnd(2, "0").slice(0, 2) || "0");
  return (sign === "-" ? -cents : cents).toString();
}

const amountCents = usdToCents(usdArg);
if (amountCents === "0") fail("Amount must not be zero.");

/* ---------------------------------------------------------------- env & keys */

function readEnvFile(file) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(full, "utf8")
      .split(/\r?\n/)
      .filter((line) => line.includes("=") && !line.trimStart().startsWith("#"))
      .map((line) => {
        const i = line.indexOf("=");
        return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
      })
  );
}

const fileEnv = { ...readEnvFile(".env.local"), ...readEnvFile(".env") };
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || fileEnv.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || fileEnv.SUPABASE_SERVICE_ROLE_KEY;

if (!url) fail("NEXT_PUBLIC_SUPABASE_URL is not set.");
if (!serviceKey) {
  fail(
    "SUPABASE_SERVICE_ROLE_KEY is not set.\n\n" +
      "    Find it at: Supabase Dashboard -> Project Settings -> API -> service_role\n" +
      "    Then:  SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/credit-balance.mjs " +
      `${userId} ${usdArg}\n\n` +
      "    Or skip the key entirely and run scripts/credit-user-balance.sql in the SQL editor."
  );
}

const headers = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  "Content-Type": "application/json",
};

async function rest(pathname, init = {}) {
  const res = await fetch(`${url}/rest/v1/${pathname}`, {
    ...init,
    headers: { ...headers, ...(init.headers ?? {}) },
  });
  const text = await res.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { ok: res.ok, status: res.status, body };
}

const usd = (cents) =>
  `$${(Number(cents) / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/* -------------------------------------------------------------------- checks */

console.log(`\n  Target user  ${userId}`);
console.log(`  Credit       ${usd(amountCents)}${dryRun ? "  (dry run)" : ""}`);

const profile = await rest(
  `profiles?select=id,email,full_name&id=eq.${userId}`
);
if (!profile.ok) {
  fail(
    `Could not read profiles (HTTP ${profile.status}): ${JSON.stringify(profile.body)}\n` +
      "    A 401 here means the key is not the service_role key."
  );
}
if (!Array.isArray(profile.body) || profile.body.length === 0) {
  fail(
    `No profile with id ${userId}.\n` +
      "    The user has to have signed up before a balance can be credited —\n" +
      "    crediting a non-existent account would fail on the foreign key anyway."
  );
}
console.log(
  `  Profile      ${profile.body[0].email ?? profile.body[0].full_name ?? "(no email on row)"}`
);

const before = await rest(
  `user_balances?select=available_cents,total_invested_cents,total_profit_cents&user_id=eq.${userId}`
);
const beforeCents = before.ok && before.body?.[0]?.available_cents != null
  ? String(before.body[0].available_cents)
  : "0";
console.log(`  Balance now  ${usd(beforeCents)}`);

// Deterministic: the same user and amount produce the same reference, so a repeat
// run is caught here rather than doubling the credit.
const reference = `manual-credit-${userId.slice(0, 8)}-${amountCents}`;

const existing = await rest(
  `transactions?select=id,created_at&reference=eq.${encodeURIComponent(reference)}`
);
if (existing.ok && Array.isArray(existing.body) && existing.body.length > 0) {
  console.log(
    `\n  ⚠ Already credited — a transaction with reference "${reference}"\n` +
      `    was created at ${existing.body[0].created_at}. Nothing changed.\n`
  );
  process.exit(0);
}

const expectedCents = (BigInt(beforeCents) + BigInt(amountCents)).toString();

if (dryRun) {
  console.log(`  Would become ${usd(expectedCents)}`);
  console.log("\n  Dry run — nothing written.\n");
  process.exit(0);
}

/* --------------------------------------------------------------------- write */

const inserted = await rest("transactions", {
  method: "POST",
  headers: { Prefer: "return=representation" },
  body: JSON.stringify([
    {
      user_id: userId,
      type: "adjustment",
      status: "completed",
      amount_cents: Number(amountCents),
      currency: "USD",
      reference,
      description: "Manual operator credit",
      // Mandatory for a completed row, and only completed rows count toward the
      // balance. See `transactions_settled_when_completed`.
      settled_at: new Date().toISOString(),
    },
  ]),
});

if (!inserted.ok) {
  fail(
    `Insert failed (HTTP ${inserted.status}): ${JSON.stringify(inserted.body)}`
  );
}

/* -------------------------------------------------------------------- verify */

const after = await rest(
  `user_balances?select=available_cents,total_invested_cents,total_profit_cents,updated_at&user_id=eq.${userId}`
);
const afterCents = after.ok && after.body?.[0]?.available_cents != null
  ? String(after.body[0].available_cents)
  : null;

if (afterCents === null) {
  fail(
    "The transaction was inserted but no user_balances row came back. Check that\n" +
      "    the transactions_refresh_balance trigger from migration 0001 exists."
  );
}

console.log(`  Balance now  ${usd(afterCents)}`);

if (afterCents !== expectedCents) {
  fail(
    `Balance is ${usd(afterCents)}, expected ${usd(expectedCents)}.\n` +
      "    The ledger row was written, so re-running will not double-credit, but the\n" +
      "    derived balance does not match. Inspect the transactions table."
  );
}

console.log(
  `\n  ✓ Credited ${usd(amountCents)} to ${userId}` +
    `\n    ${usd(beforeCents)} -> ${usd(afterCents)}` +
    `\n    Ledger reference: ${reference}\n`
);

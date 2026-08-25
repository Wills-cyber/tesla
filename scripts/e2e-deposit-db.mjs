#!/usr/bin/env node
/**
 * End-to-end database test for the USDT deposit → admin review flow.
 *
 * Runs the REAL schema (all migrations in supabase/migrations/, in order) on a
 * throwaway embedded PostgreSQL 16 cluster, with Supabase-compatible stubs for
 * the `auth` and `storage` schemas, and exercises every role exactly the way
 * Supabase does: all application-side queries run as the `authenticated` role
 * with the caller's JWT claim set as a GUC, so Row Level Security and the
 * security-definer RPCs are exercised for real.
 *
 * What this proves (data path Storage → database → admin review):
 *   1. Every migration applies cleanly on a fresh cluster.
 *   2. Users can upload receipts to deposit-receipts/{user_id}/... only inside
 *      their own folder (Storage RLS), and cannot touch others' folders.
 *   3. submit_deposit_receipt() stores the EXACT storage path on the deposit
 *      and moves it to pending_review; malformed paths are rejected.
 *   4. admin_get_deposits() returns the receipt path + user details to the
 *      admin and refuses non-admins.
 *   5. The storage SELECT policy lets the admin (but not other users) see the
 *      object — the exact permission a signed URL requires.
 *   6. admin_approve_deposit() credits the wallet exactly once through the
 *      transactions ledger + user_balances trigger, is idempotent on repeat
 *      calls, refuses non-admins, and refuses receipts-less / reviewed rows.
 *   7. admin_decline_deposit() records the admin, reason and time, never
 *      credits, and only applies to pending/pending_review rows.
 *   8. No client can write deposits, transactions or balances directly (RLS).
 *
 * Usage:  node scripts/e2e-deposit-db.mjs
 *         (or: npm run test:deposit-db)
 */

import { readFileSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import EmbeddedPostgres from "embedded-postgres";
import pg from "pg";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATIONS_DIR = path.join(ROOT, "supabase", "migrations");
const DATA_DIR =
  process.env.E2E_PG_DATA_DIR ||
  path.join(ROOT, "..", ".e2e-pgdata", "deposit-flow");
const PORT = Number(process.env.E2E_PG_PORT || 54329);

const ADMIN_ID = "f91a9db9-8f13-4759-9b10-a0cdf385e7d4";
const ALICE_ID = "1a111111-2222-4333-8444-555555555555";
const BOB_ID = "aaaa0000-bbbb-4ccc-8ddd-eeeeeeeeeeee";

let passed = 0;
let failed = 0;
const failures = [];

function check(name, cond, detail = "") {
  if (cond) {
    passed += 1;
    console.log(`  PASS   ${name}`);
  } else {
    failed += 1;
    failures.push(name);
    console.log(`  FAIL   ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(title) {
  console.log(`\n=== ${title} ===`);
}

/* -------------------------------------------------------------------------- */
/* Stubs: the Supabase-owned schemas the migrations depend on.                */
/* -------------------------------------------------------------------------- */

const STUB_SQL = `
create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Supabase sets request.jwt.claims per PostgREST request; auth.uid() reads it.
create or replace function auth.uid()
returns uuid
language sql stable
as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::jsonb
          ->> 'sub')::uuid
$$;

create or replace function auth.jwt()
returns jsonb
language sql stable
as $$
  select nullif(current_setting('request.jwt.claims', true), '')::jsonb
$$;

create schema if not exists storage;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  owner uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  public boolean not null default false,
  avif_autodetect boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null,
  name text not null,
  owner uuid,
  owner_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_accessed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  constraint objects_bucket_name_unique unique (bucket_id, name)
);

alter table storage.objects enable row level security;

-- Folders of a path, excluding the filename (supabase/storage-api semantics).
create or replace function storage.foldername(name text)
returns text[]
language sql immutable
as $$
  select case
    when length(name) - length(replace(name, '/', '')) > 0
    then (string_to_array(name, '/'))[
           1 : (length(name) - length(replace(name, '/', '')))
         ]
    else null
  end
$$;

-- Supabase's PostgREST connects as these roles.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon login password 'anon';
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated login password 'authenticated';
  end if;
end
$$;
`;

/** Broad grants, exactly like Supabase: RLS is the boundary, not table grants. */
const GRANTS_SQL = `
grant usage on schema public to anon, authenticated;
grant usage on schema storage to anon, authenticated;
grant usage on schema auth to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema storage to anon, authenticated;
grant select, insert, update, delete on all tables in schema auth to anon, authenticated;
grant execute on all functions in schema public to anon, authenticated;
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;
`;

/* -------------------------------------------------------------------------- */

const TEST_USERS = `
      insert into auth.users (id, email, raw_user_meta_data) values
        ('${ADMIN_ID}', 'admin@tesla.test', '{"full_name": "Platform Admin"}'::jsonb),
        ('${ALICE_ID}', 'alice@tesla.test', '{"full_name": "Alice Investor"}'::jsonb),
        ('${BOB_ID}', 'bob@tesla.test', '{"full_name": "Bob Bystander"}'::jsonb)
`;

/**
 * Applies every migration in order. The admin user must already exist in
 * auth.users when 0010 references it (admins.user_id → auth.users), so the
 * test users are inserted right before it — exactly as in a live project.
 */
async function runMigrations(admin) {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  section("Applying migrations");
  let usersInserted = false;
  for (const file of files) {
    if (!usersInserted && file >= "0010") {
      await admin.query(TEST_USERS);
      usersInserted = true;
      console.log("  seeded    auth.users (admin + 2 regular users)");
    }
    const sql = readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    await admin.query(sql);
    console.log(`  applied  ${file}`);
  }
  check(`All ${files.length} migrations applied cleanly`, true);
}

async function main() {
  rmSync(DATA_DIR, { recursive: true, force: true });

  const cluster = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: "postgres",
    password: "postgres",
    port: PORT,
    persistent: false,
  });

  console.log(`[harness] initdb (port ${PORT})…`);
  await cluster.initialise();
  console.log("[harness] starting cluster…");
  await cluster.start();
  await cluster.createDatabase("tesla_test");
  console.log("[harness] cluster ready");

  const admin = cluster.getPgClient("tesla_test", "127.0.0.1");
  await admin.connect();

  let app = null;

  try {
    await admin.query(STUB_SQL);
    console.log("[harness] stub schemas + roles ready");
    await runMigrations(admin);
    await admin.query(GRANTS_SQL);

    // Connect as the `authenticated` role only once it exists.
    app = new pg.Client({
      host: "127.0.0.1",
      port: PORT,
      user: "authenticated",
      password: "authenticated",
      database: "tesla_test",
    });
    await app.connect();
    console.log("[harness] connected as authenticated role");

    // Test users were seeded by runMigrations before 0010; the 0001 trigger
    // created their profiles + user_balances rows.
    const profiles = await admin.query(
      "select id, email, account_status from public.profiles order by email"
    );
    check(
      "Profile provisioning trigger created 3 profiles",
      profiles.rowCount === 3,
      `got ${profiles.rowCount}`
    );
    const balances = await admin.query(
      "select count(*)::int as n from public.user_balances"
    );
    check(
      "user_balances rows pre-created for all users",
      balances.rows[0].n === 3
    );

    const bucket = await admin.query(
      "select public, file_size_limit from storage.buckets where id = 'deposit-receipts'"
    );
    check(
      "deposit-receipts bucket exists and is PRIVATE",
      bucket.rowCount === 1 &&
        bucket.rows[0].public === false &&
        Number(bucket.rows[0].file_size_limit) === 10485760
    );

    /** Run `fn` with the given caller identity, like a Supabase session. */
    async function withClaims(claims, fn) {
      await app.query("select set_config('request.jwt.claims', $1, false)", [
        JSON.stringify(claims),
      ]);
      return fn();
    }
    const alice = (fn) => withClaims({ sub: ALICE_ID, role: "authenticated" }, fn);
    const bob = (fn) => withClaims({ sub: BOB_ID, role: "authenticated" }, fn);
    const adminUser = (fn) =>
      withClaims({ sub: ADMIN_ID, role: "authenticated" }, fn);
    const anon = (fn) => withClaims({}, fn);

    /** Run `select * from public.<rpc>(<params>)` as the wrapped caller. */
    function rpcCall(rpcName, params) {
      const inner = /^\s*\(.*\)\s*$/.test(params) ? params.trim().slice(1, -1) : params;
      return `select * from public.${rpcName}(${inner})`;
    }
    async function rpcRow(who, rpcName, params) {
      return who(async () => {
        const { rows } = await app.query(rpcCall(rpcName, params));
        return rows[0] ?? null;
      });
    }
    async function rpcErr(who, rpcName, params) {
      return who(async () => {
        try {
          await app.query(rpcCall(rpcName, params));
          return null;
        } catch (err) {
          return err;
        }
      });
    }
    async function sql(who, sqlText, params = []) {
      return who(async () => (await app.query(sqlText, params)).rows[0]);
    }
    async function sqlRows(who, sqlText, params = []) {
      return who(async () => (await app.query(sqlText, params)).rows);
    }
    async function nRows(who, sqlText, params = []) {
      return who(async () => (await app.query(sqlText, params)).rowCount);
    }
    /**
     * A statement that MUST be refused (RLS). Returns the SQLSTATE code —
     * an INSERT whose WITH CHECK fails raises 42501; an UPDATE/DELETE that
     * matches nothing is a silent no-op.
     */
    async function refused(who, sqlText, params = []) {
      return who(async () => {
        try {
          await app.query(sqlText, params);
          return "allowed";
        } catch (err) {
          return err.code ?? "unknown";
        }
      });
    }

    /* ------------------------------------------------------ admin identity */
    section("Admin identity (is_admin)");
    check(
      "is_admin() true for the designated admin",
      (await sql(adminUser, "select public.is_admin() as v"))?.v === true
    );
    check(
      "is_admin() false for a regular user",
      (await sql(alice, "select public.is_admin() as v"))?.v === false
    );
    check(
      "is_admin() not true for anonymous (NULL or false)",
      (await sql(anon, "select public.is_admin() as v"))?.v !== true
    );

    /* ------------------------------------------- client writes are blocked */
    section("Deposit creation + RLS: clients cannot write financial rows");

    const deposit1 = await rpcRow(alice, "create_deposit_request", "('usdt-bsc', 500000)");
    check(
      "create_deposit_request() makes a pending deposit (5,000 USDT)",
      deposit1 &&
        deposit1.status === "pending" &&
        Number(deposit1.amount_cents) === 500000 &&
        String(deposit1.reference || "").startsWith("DEP-") &&
        new Date(deposit1.expires_at).getTime() > Date.now(),
      JSON.stringify(deposit1)
    );

    check(
      "user cannot INSERT a deposit directly (RLS 42501)",
      (await refused(alice, "insert into public.deposits (user_id, method_id, status) values ($1, 'usdt-bsc', 'pending')", [ALICE_ID])) === "42501"
    );
    check(
      "user cannot UPDATE a deposit directly (the silent-failure trap)",
      (await nRows(alice, "update public.deposits set status = 'approved' where id = $1", [deposit1.id])) === 0
    );
    check(
      "user cannot INSERT ledger transactions directly (RLS 42501)",
      (await refused(alice, "insert into public.transactions (user_id, type, status, amount_cents) values ($1, 'deposit', 'completed', 100)", [ALICE_ID])) === "42501"
    );
    check(
      "user cannot UPDATE their balance directly",
      (await nRows(alice, "update public.user_balances set available_cents = 999999999 where user_id = $1", [ALICE_ID])) === 0
    );
    check(
      "deposit status is still pending after the blocked writes",
      (await sql(alice, "select status from public.deposits where id = $1", [deposit1.id])).status === "pending"
    );

    /* ------------------------------------------------- storage upload RLS */
    section("Storage RLS: deposit-receipts uploads");

    const receiptPath1 = `${ALICE_ID}/${deposit1.id}/receipt-1753400000000-abc123de.jpg`;

    check(
      "user can upload a receipt into their own folder",
      (await nRows(alice, "insert into storage.objects (bucket_id, name, owner) values ('deposit-receipts', $1, $2)", [receiptPath1, ALICE_ID])) === 1
    );
    check(
      "user CANNOT upload into another user's folder (RLS 42501)",
      (await refused(alice, "insert into storage.objects (bucket_id, name, owner) values ('deposit-receipts', $1, $2)", [`${BOB_ID}/${deposit1.id}/receipt-x.jpg`, ALICE_ID])) === "42501"
    );
    check(
      "other user CANNOT upload into alice's folder (RLS 42501)",
      (await refused(bob, "insert into storage.objects (bucket_id, name, owner) values ('deposit-receipts', $1, $2)", [receiptPath1, BOB_ID])) === "42501"
    );
    check(
      "admin CANNOT upload (owner-only policy, RLS 42501)",
      (await refused(adminUser, "insert into storage.objects (bucket_id, name, owner) values ('deposit-receipts', $1, $2)", [receiptPath1, ADMIN_ID])) === "42501"
    );
    check(
      "object path with a double-folder escape is rejected (RLS 42501)",
      (await refused(alice, "insert into storage.objects (bucket_id, name, owner) values ('deposit-receipts', $1, $2)", [`../../${ALICE_ID}/receipt-x.jpg`, ALICE_ID])) === "42501"
    );

    /* --------------------------------------------- receipt submission RPC */
    section("submit_deposit_receipt (Storage path → deposit record)");

    const badPath = await rpcErr(alice, "submit_deposit_receipt", `('${deposit1.id}', '${BOB_ID}/${deposit1.id}/receipt-1.jpg', null)`);
    check(
      "rejects a path outside the user's own folder",
      badPath && /Invalid receipt storage path/i.test(badPath.message),
      badPath?.message
    );
    const bareName = await rpcErr(alice, "submit_deposit_receipt", `('${deposit1.id}', 'receipt-1.jpg', null)`);
    check(
      "rejects a bare filename (not the full storage path)",
      bareName && /Invalid receipt storage path/i.test(bareName.message),
      bareName?.message
    );

    const submitted = await rpcRow(alice, "submit_deposit_receipt", `('${deposit1.id}', '${receiptPath1}', null)`);
    check(
      "receipt submission stores the EXACT storage path",
      submitted?.receipt_path === receiptPath1,
      submitted?.receipt_path
    );
    check("status moves to pending_review", submitted?.status === "pending_review");
    check(
      "no public URL is stored (receipt_url stays null)",
      submitted?.receipt_url === null,
      String(submitted?.receipt_url)
    );
    check("receipt_submitted_at is recorded", Boolean(submitted?.receipt_submitted_at));

    const doubleSubmit = await rpcErr(alice, "submit_deposit_receipt", `('${deposit1.id}', '${receiptPath1}', null)`);
    check(
      "resubmission is rejected (no longer pending)",
      doubleSubmit && /not pending/i.test(doubleSubmit.message),
      doubleSubmit?.message
    );

    const pendingNotice = await sql(
      alice,
      "select count(*)::int as n from public.notifications where user_id = $1 and title = 'Payment Pending Review'",
      [ALICE_ID]
    );
    check("user notified that proof is pending review", pendingNotice.n >= 1);

    /* -------------------------------------------------- admin visibility */
    section("admin_get_deposits (admin panel query)");

    const adminList = await rpcRow(adminUser, "admin_get_deposits", `('pending_review')`);
    check("admin sees the pending_review deposit", Boolean(adminList));
    check(
      "admin query returns the receipt path (the attachment admin UI needs)",
      adminList?.receipt_path === receiptPath1
    );
    check(
      "admin query returns user email + name",
      adminList?.user_email === "alice@tesla.test" &&
        adminList?.user_full_name === "Alice Investor"
    );

    const nonAdminList = await rpcErr(alice, "admin_get_deposits", `(null)`);
    check(
      "non-admin is refused the admin query",
      nonAdminList && /Not authorized/i.test(nonAdminList.message),
      nonAdminList?.message
    );

    /* ------------------------------------ storage select (signed URL gate) */
    section("Storage SELECT policy — the permission a signed URL needs");

    check(
      "admin can SELECT alice's receipt object",
      (await nRows(adminUser, "select 1 from storage.objects where bucket_id = 'deposit-receipts' and name = $1", [receiptPath1])) === 1
    );
    check(
      "bob CANNOT select alice's receipt object",
      (await nRows(bob, "select 1 from storage.objects where bucket_id = 'deposit-receipts' and name = $1", [receiptPath1])) === 0
    );
    check(
      "alice (owner) can select her own receipt object",
      (await nRows(alice, "select 1 from storage.objects where bucket_id = 'deposit-receipts' and name = $1", [receiptPath1])) === 1
    );

    /* ------------------------------------------------ approval + credit */
    section("admin_approve_deposit (atomic credit, once only)");

    const noReceiptDep = await rpcRow(alice, "create_deposit_request", "('usdt-ethereum', 1500000)");
    const noReceiptErr = await rpcErr(adminUser, "admin_approve_deposit", `('${noReceiptDep.id}')`);
    check(
      "approve without a receipt is refused by the database",
      noReceiptErr && /no receipt attached/i.test(noReceiptErr.message),
      noReceiptErr?.message
    );

    const nonAdminApprove = await rpcErr(alice, "admin_approve_deposit", `('${deposit1.id}')`);
    check(
      "non-admin approve is refused (42501)",
      nonAdminApprove && nonAdminApprove.code === "42501",
      nonAdminApprove?.message
    );

    const approved = await rpcRow(adminUser, "admin_approve_deposit", `('${deposit1.id}')`);
    check(
      "approval sets status approved + credited_cents",
      approved?.status === "approved" && Number(approved?.credited_cents) === 500000
    );
    check(
      "approval records the ledger transaction id",
      Boolean(approved?.transaction_id)
    );
    check(
      "approval records reviewed_by (admin) + reviewed_at + settled_at",
      approved?.reviewed_by === ADMIN_ID &&
        Boolean(approved?.reviewed_at) &&
        Boolean(approved?.settled_at)
    );

    const ledger = await admin.query(
      `select count(*)::int as n, coalesce(sum(amount_cents), 0)::bigint as total
         from public.transactions
        where user_id = $1 and type = 'deposit' and status = 'completed'`,
      [ALICE_ID]
    );
    check(
      "exactly ONE completed deposit ledger row for the exact amount",
      ledger.rows[0].n === 1 && Number(ledger.rows[0].total) === 500000,
      JSON.stringify(ledger.rows[0])
    );

    const balance1 = await admin.query(
      "select available_cents, total_deposited_cents from public.user_balances where user_id = $1",
      [ALICE_ID]
    );
    check(
      "wallet balance reflects the credit exactly once (5,000 USDT)",
      Number(balance1.rows[0].available_cents) === 500000 &&
        Number(balance1.rows[0].total_deposited_cents) === 500000,
      JSON.stringify(balance1.rows[0])
    );

    const confirmedNotice = await sql(
      alice,
      "select count(*)::int as n from public.notifications where user_id = $1 and title = 'Deposit Confirmed'",
      [ALICE_ID]
    );
    check("user notified that the deposit was confirmed", confirmedNotice.n >= 1);

    const reapprove = await rpcRow(adminUser, "admin_approve_deposit", `('${deposit1.id}')`);
    const ledger2 = await admin.query(
      `select count(*)::int as n, coalesce(sum(amount_cents), 0)::bigint as total
         from public.transactions
        where user_id = $1 and type = 'deposit' and status = 'completed'`,
      [ALICE_ID]
    );
    const balance2 = await admin.query(
      "select available_cents from public.user_balances where user_id = $1",
      [ALICE_ID]
    );
    check(
      "second Approve click is idempotent: same row, no new ledger row, no extra credit",
      reapprove?.status === "approved" &&
        ledger2.rows[0].n === 1 &&
        Number(ledger2.rows[0].total) === 500000 &&
        Number(balance2.rows[0].available_cents) === 500000,
      JSON.stringify({ n: ledger2.rows[0].n, bal: balance2.rows[0].available_cents })
    );

    /* ------------------------------------------------------------ decline */
    section("admin_decline_deposit (no credit, audit recorded)");

    const dep2 = await rpcRow(alice, "create_deposit_request", "('usdt-bsc', 2000000)");
    const receiptPath2 = `${ALICE_ID}/${dep2.id}/receipt-1753400000001-ff00ddcc.pdf`;
    await nRows(alice, "insert into storage.objects (bucket_id, name, owner) values ('deposit-receipts', $1, $2)", [receiptPath2, ALICE_ID]);
    await rpcRow(alice, "submit_deposit_receipt", `('${dep2.id}', '${receiptPath2}', null)`);

    const noReason = await rpcErr(adminUser, "admin_decline_deposit", `('${dep2.id}', '')`);
    check("decline requires a reason", noReason && /reason is required/i.test(noReason.message));

    const declined = await rpcRow(adminUser, "admin_decline_deposit", `('${dep2.id}', 'Amount mismatch')`);
    check(
      "decline sets status declined + rejection_reason + audit",
      declined?.status === "declined" &&
        declined?.rejection_reason === "Amount mismatch" &&
        declined?.reviewed_by === ADMIN_ID &&
        Boolean(declined?.reviewed_at)
    );

    const ledger3 = await admin.query(
      `select count(*)::int as n from public.transactions where user_id = $1 and type = 'deposit'`,
      [ALICE_ID]
    );
    const balance3 = await admin.query(
      "select available_cents from public.user_balances where user_id = $1",
      [ALICE_ID]
    );
    check(
      "declined deposit never credits the wallet (still the single 5,000 credit)",
      ledger3.rows[0].n === 1 && Number(balance3.rows[0].available_cents) === 500000,
      JSON.stringify({ n: ledger3.rows[0].n, bal: balance3.rows[0].available_cents })
    );

    const declinedNotice = await sql(
      alice,
      "select count(*)::int as n from public.notifications where user_id = $1 and title = 'Deposit Declined'",
      [ALICE_ID]
    );
    check("user notified of the decline", declinedNotice.n >= 1);

    const declineAgain = await rpcErr(adminUser, "admin_decline_deposit", `('${dep2.id}', 'Second reason')`);
    check(
      "re-declining an already declined request is refused (state not in pending)",
      declineAgain && /cannot be declined/i.test(declineAgain.message),
      declineAgain?.message
    );
    const declineApproved = await rpcErr(adminUser, "admin_decline_deposit", `('${deposit1.id}', 'Too late')`);
    check(
      "declining an approved deposit is refused",
      declineApproved && /cannot be declined/i.test(declineApproved.message),
      declineApproved?.message
    );
    const nonAdminDecline = await rpcErr(bob, "admin_decline_deposit", `('${dep2.id}', 'Nope')`);
    check("non-admin decline is refused (42501)", nonAdminDecline?.code === "42501");

    /* ----------------------------------------------------------- expiry */
    section("Expiration and cancellation");

    const dep3 = await rpcRow(alice, "create_deposit_request", "('usdt-bsc', 3000000)");
    await admin.query(
      "update public.deposits set expires_at = now() - interval '1 minute' where id = $1",
      [dep3.id]
    );
    const expiredReceipt = await rpcErr(alice, "submit_deposit_receipt", `('${dep3.id}', '${ALICE_ID}/${dep3.id}/receipt-1753400000002-eeeeeeee.jpg', null)`);
    check(
      "submitting proof on an expired request is refused",
      expiredReceipt && /expired/i.test(expiredReceipt.message),
      expiredReceipt?.message
    );
    // A transaction that raises cannot also commit the `expired` update
    // (migration 0015), so the marking happens via a separate owner-only RPC.
    const expiredRow = await rpcRow(alice, "expire_stale_deposit", `('${dep3.id}')`);
    check(
      "expire_stale_deposit() marks the stale pending row expired",
      expiredRow?.status === "expired"
    );
    const foreignExpire = await rpcErr(bob, "expire_stale_deposit", `('${dep3.id}')`);
    check(
      "expire_stale_deposit() is owner-only (foreign id not found)",
      foreignExpire?.code === "P0002",
      foreignExpire?.message
    );
    // And the admin queue sweeps stale rows on its own, even when no one
    // called the RPC: a fresh pending row past its expiry shows as expired.
    const dep3b = await rpcRow(alice, "create_deposit_request", "('usdt-bsc', 2500000)");
    await admin.query(
      "update public.deposits set expires_at = now() - interval '1 minute' where id = $1",
      [dep3b.id]
    );
    const swept = await sqlRows(adminUser, "select * from public.admin_get_deposits(null)");
    check(
      "admin_get_deposits() sweeps stale pending rows to expired on refresh",
      Array.isArray(swept) && swept.find((r) => r.id === dep3b.id)?.status === "expired",
      JSON.stringify(swept.map((r) => ({ id: r.id, status: r.status })))
    );

    const dep4 = await rpcRow(alice, "create_deposit_request", "('usdt-bsc', 4000000)");
    const cancelled = await rpcRow(alice, "cancel_deposit", `('${dep4.id}')`);
    check("user can cancel their own pending deposit", cancelled?.status === "cancelled");
    const cancelAgain = await rpcErr(alice, "cancel_deposit", `('${dep4.id}')`);
    check(
      "cancelling a cancelled deposit is refused",
      cancelAgain && /cannot be cancelled/i.test(cancelAgain.message),
      cancelAgain?.message
    );

    /* ------------------------------------------------------- final state */
    section("Cross-user integrity");

    const bobBalance = await admin.query(
      "select available_cents from public.user_balances where user_id = $1",
      [BOB_ID]
    );
    check("bob's balance is untouched (0)", Number(bobBalance.rows[0].available_cents) === 0);

    const bobDeposits = await sql(bob, "select count(*)::int as n from public.deposits");
    check("bob sees no deposits at all (owner-scoped RLS select)", bobDeposits.n === 0);

    const deposit1Final = await sql(alice, "select status from public.deposits where id = $1", [deposit1.id]);
    check(
      "refresh-stable status: deposit1 still approved after all of the above",
      deposit1Final.status === "approved"
    );
  } finally {
    if (app) await app.end().catch(() => {});
    await admin.end().catch(() => {});
    await cluster.stop().catch(() => {});
  }

  section("Summary");
  console.log(`  ${passed} passed, ${failed} failed`);
  if (failures.length > 0) {
    console.log("\nFailures:");
    for (const f of failures) console.log(`  - ${f}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("\nHarness error:", err === undefined ? "(undefined rejection)" : err);
  if (err instanceof Error && err.stack) console.error(err.stack);
  process.exitCode = 1;
});

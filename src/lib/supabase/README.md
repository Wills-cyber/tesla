# Supabase integration

Everything needed to switch this app onto a real Supabase project lives in this
folder plus `src/lib/data/`. Nothing here is connected yet — the app runs with
`isSupabaseConfigured() === false` and renders honest empty states.

## Files

| File | Runtime | Purpose |
| --- | --- | --- |
| `client.ts` | Browser | Memoised `createBrowserClient`. Returns `null` when unconfigured. |
| `server.ts` | Server only | Per-request `createServerClient` + `getServerUser()`. Guarded with `server-only`. |
| `proxy.ts` | Proxy (`src/proxy.ts`) | Refreshes the auth session and mirrors rotated cookies onto the response. |

## Connecting a project

1. Create the project at <https://supabase.com/dashboard>.
2. Copy `.env.example` to `.env.local` and fill in:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
   ```

3. Apply the schema in `supabase/migrations/` (see `supabase/README.md`).
4. Regenerate types over the hand-written stand-in:

   ```bash
   npx supabase gen types typescript --project-id <ref> --schema public \
     > src/types/database.ts
   ```

5. Restart `npm run dev`. `isSupabaseConfigured()` flips to `true`, the proxy
   starts guarding `/dashboard`, and the data-access layer switches from
   `unconfigured` to live queries. No component changes are required.

## Credential rules

- **Only** the `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  values belong in client-reachable code. The anon key is safe to ship; it is
  useless without Row Level Security policies, which is why every table has
  them.
- The **service-role key must never appear in this app**. It bypasses RLS
  entirely. There is deliberately no helper for it in `src/lib/env.ts`. If a
  future admin task needs it, put that task in a separate server-only surface
  (Route Handler, Edge Function, or a background job), read the key from
  `process.env` inside that file, and never import that file from anything that
  can reach a Client Component.
- `.env*.local` is gitignored. Never commit real credentials; set them in the
  Vercel project's environment variables instead.

## Authorization model

`server.ts` uses `supabase.auth.getUser()`, not `getSession()`. `getSession()`
reads the JWT straight out of the cookie without contacting the auth server, so
it can be spoofed and must not be used for authorization. The proxy performs an
optimistic redirect for UX; the real check happens per request in
`src/lib/auth/session.ts` and, ultimately, in the RLS policies.

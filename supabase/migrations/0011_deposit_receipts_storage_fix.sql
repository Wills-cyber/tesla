-- =============================================================================
-- Migration 0011: Fix deposit-receipts storage bucket and secure policies
--
-- Purpose:
--   - Ensure private bucket `deposit-receipts` exists (fixes UI success with no bucket)
--   - Enforce private bucket, 10MB limit, allowed MIME types
--   - Secure RLS policies:
--     * Users can upload their own receipts only (folder = user_id)
--     * Users can view their own receipts only
--     * Users can update/delete their own receipts only
--     * Admin (f91a9db9-8f13-4759-9b10-a0cdf385e7d4 or admins table) can view all
--   - Path format: {user_id}/{deposit_id}/{filename}
-- =============================================================================

-- ---------------------------------------------------------- 1. Ensure bucket exists and is PRIVATE
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'deposit-receipts',
  'deposit-receipts',
  false,
  10485760, -- 10MB
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];

-- ---------------------------------------------------------- 2. Ensure is_admin function exists (idempotent)
create or replace function public.is_admin(p_user uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.admins where user_id = p_user
  ) or p_user = 'f91a9db9-8f13-4759-9b10-a0cdf385e7d4'::uuid;
$$;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated;

-- ---------------------------------------------------------- 3. Drop existing policies (if any) to recreate securely
drop policy if exists "Users can upload their own deposit receipts" on storage.objects;
drop policy if exists "Users can view their own deposit receipts" on storage.objects;
drop policy if exists "Users can update their own deposit receipts" on storage.objects;
drop policy if exists "Users can delete their own deposit receipts" on storage.objects;
drop policy if exists "Admins can view all deposit receipts" on storage.objects;
drop policy if exists "Users can upload their own receipt" on storage.objects;
drop policy if exists "Users can view their own receipt" on storage.objects;
drop policy if exists "Deposit receipts are private" on storage.objects;
drop policy if exists "deposit-receipts insert" on storage.objects;
drop policy if exists "deposit-receipts select" on storage.objects;
drop policy if exists "deposit-receipts update" on storage.objects;
drop policy if exists "deposit-receipts delete" on storage.objects;

-- ---------------------------------------------------------- 4. Secure policies

-- INSERT: Only owner can upload to their own folder (first folder = user_id)
create policy "Users can upload their own deposit receipts"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'deposit-receipts'
    and (auth.uid())::text = (storage.foldername(name))[1]
  );

-- SELECT: Owner can view own, admin can view all
create policy "Users can view their own deposit receipts"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'deposit-receipts'
    and (
      (auth.uid())::text = (storage.foldername(name))[1]
      or public.is_admin()
    )
  );

-- UPDATE: Only owner can update their own receipts (prevent cross-user modification)
create policy "Users can update their own deposit receipts"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'deposit-receipts'
    and (auth.uid())::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'deposit-receipts'
    and (auth.uid())::text = (storage.foldername(name))[1]
  );

-- DELETE: Only owner can delete their own receipts
create policy "Users can delete their own deposit receipts"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'deposit-receipts'
    and (auth.uid())::text = (storage.foldername(name))[1]
  );

-- ---------------------------------------------------------- 5. Ensure admin user exists in admins table
insert into public.admins (user_id)
values ('f91a9db9-8f13-4759-9b10-a0cdf385e7d4'::uuid)
on conflict do nothing;

-- ---------------------------------------------------------- 6. Verify bucket is private (extra safety)
update storage.buckets
set public = false
where id = 'deposit-receipts' and public = true;

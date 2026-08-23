-- =============================================================================
-- Point plan artwork at the new PNG files.
--
-- The real vehicle artwork arrived as PNG, replacing the generated WebP
-- placeholders. `src/config/investment-plans.ts` now derives `.png`, but that file
-- is only the fallback used when Supabase is unconfigured — the live app reads
-- `investment_plans.image_url`, so without this migration every plan would keep
-- requesting a `.webp` that no longer exists and fall back to the "image not
-- available" frame.
--
-- Written as a suffix rewrite rather than five literals so it cannot disagree with
-- the slug, and scoped to rows that actually end in `.webp` so re-running is a
-- no-op.
-- =============================================================================

update public.investment_plans
   set image_url = left(image_url, length(image_url) - length('.webp')) || '.png',
       updated_at = now()
 where image_url like '/images/investments/%.webp';

-- Fails loudly if anything is still pointing at a WebP file, rather than leaving a
-- broken image to be discovered on the marketplace.
do $$
declare
  v_stale integer;
begin
  select count(*) into v_stale
    from public.investment_plans
   where image_url not like '%.png';

  if v_stale > 0 then
    raise exception
      '% investment_plans row(s) still do not reference a .png image', v_stale;
  end if;

  raise notice 'All investment_plans rows now reference .png artwork.';
end $$;

-- =============================================================================
-- Seed the published investment plan catalogue.
--
-- These rows mirror `src/config/investment-plans.ts` exactly. The config file is
-- the fallback used before Supabase is connected; this seed is what the database
-- serves afterwards. Keeping them identical means connecting the backend does not
-- change a single figure on the marketing site.
--
-- Note the status: `coming_soon`. No plan is `open`, so no plan can be funded.
-- Only `open` plans should ever be activatable, and flipping that flag is a
-- deliberate decision to be made after compliance review — not a seed value.
-- =============================================================================

insert into public.investment_plans (
  slug,
  name,
  summary,
  vehicle_type,
  currency,
  investment_amount_cents,
  duration_days,
  stated_weekly_profit_cents,
  payment_periods,
  stated_total_profit_cents,
  principal_cents,
  completion_amount_cents,
  status,
  image_key,
  featured,
  sort_order
)
values (
  'vehicle-investment',
  'Vehicle Investment',
  'A fixed-term plan modelled on the electric vehicle category, with stated profit released across four scheduled payment periods.',
  'Electric Vehicle',
  'USD',
  100000,   -- $1,000.00 investment
  30,       -- 30 days
  40000,    -- $400.00 stated profit per period
  4,        -- 4 payment periods
  160000,   -- $1,600.00 total stated profit
  100000,   -- $1,000.00 principal
  260000,   -- $2,600.00 completion amount
  'coming_soon',
  'compact-sedan',
  true,
  10
)
on conflict (slug) do update
  set name = excluded.name,
      summary = excluded.summary,
      vehicle_type = excluded.vehicle_type,
      currency = excluded.currency,
      investment_amount_cents = excluded.investment_amount_cents,
      duration_days = excluded.duration_days,
      stated_weekly_profit_cents = excluded.stated_weekly_profit_cents,
      payment_periods = excluded.payment_periods,
      stated_total_profit_cents = excluded.stated_total_profit_cents,
      principal_cents = excluded.principal_cents,
      completion_amount_cents = excluded.completion_amount_cents,
      status = excluded.status,
      image_key = excluded.image_key,
      featured = excluded.featured,
      sort_order = excluded.sort_order;

-- =============================================================================
-- The five vehicle investment plans.
--
-- Replaces the single placeholder 'vehicle-investment' plan seeded in 0002 with
-- the published catalogue: Model 3 Starter through Cybertruck Executive.
--
-- Two schema changes come first:
--
--   · `vehicle_model` — the specific model a plan is modelled around, e.g.
--     'Tesla Model 3'. Previously only the broad segment was stored, which is not
--     enough to render a card: "Electric Sedan" does not tell a reader which
--     vehicle the plan references.
--   · `image_url` replaces `image_key`. A key required a lookup table in the
--     application to resolve, which meant plan artwork could not be changed
--     without a deploy. A path can: drop a file at
--     `public/images/investments/<slug>.webp` and it renders.
--
-- These rows mirror `src/config/investment-plans.ts` exactly. That file is the
-- fallback used before Supabase is connected; this seed is what the database
-- serves afterwards. Keeping them identical means connecting the backend does not
-- change a single figure on any screen.
--
-- Note the status: every plan is `coming_soon`. No plan is `open`, so no plan can
-- be funded — only `open` plans are ever activatable, and flipping that flag is a
-- deliberate decision to be made after compliance review, not a seed value.
--
-- The arithmetic is enforced, not trusted. `plans_total_profit_consistent` and
-- `plans_completion_consistent` (see 0001) mean a plan whose stated figures don't
-- add up cannot be stored at all. Every row below satisfies:
--     stated_total_profit_cents = stated_weekly_profit_cents * payment_periods
--     completion_amount_cents   = principal_cents + stated_total_profit_cents
-- =============================================================================

-- ------------------------------------------------------------ schema additions
alter table public.investment_plans
  add column if not exists vehicle_model text not null default '',
  add column if not exists image_url text not null default '';

-- Backfill before dropping the old column, so no row is left without artwork.
update public.investment_plans
   set image_url = '/images/investments/' || slug || '.webp'
 where image_url = '';

update public.investment_plans
   set vehicle_model = vehicle_type
 where vehicle_model = '';

alter table public.investment_plans
  drop column if exists image_key;

alter table public.investment_plans
  add constraint plans_vehicle_model_not_blank
    check (length(trim(vehicle_model)) > 0),
  add constraint plans_image_url_not_blank
    check (length(trim(image_url)) > 0);

-- The defaults existed only to backfill. Requiring both columns explicitly from
-- here on stops a future insert from quietly creating a plan with no image.
alter table public.investment_plans
  alter column vehicle_model drop default,
  alter column image_url drop default;

-- ------------------------------------------------- retire the 0002 placeholder
-- Deleted rather than renamed: 'vehicle-investment' is superseded by
-- 'model-3-starter', and leaving it would show a sixth plan on the marketplace.
-- `on delete restrict` on investments.plan_id protects any real position — if one
-- somehow existed, this statement fails loudly instead of orphaning it.
delete from public.investment_plans where slug = 'vehicle-investment';

-- ------------------------------------------------------------------- catalogue
insert into public.investment_plans (
  slug,
  name,
  summary,
  vehicle_model,
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
  image_url,
  featured,
  sort_order
)
values
  (
    'model-3-starter',
    'Model 3 Starter',
    'The introductory plan, modelled on the compact electric sedan segment. The lowest entry amount on the platform, with stated profit released across four scheduled weekly periods.',
    'Tesla Model 3',
    'Electric Sedan',
    'USD',
    100000,    -- $1,000 investment
    30,        -- 30 days
    40000,     -- $400 per period
    4,
    160000,    -- $1,600 total stated profit  (400 x 4)
    100000,    -- $1,000 principal
    260000,    -- $2,600 completion           (1,000 + 1,600)
    'coming_soon',
    '/images/investments/model-3-starter.webp',
    true,      -- featured: lowest entry amount
    10
  ),
  (
    'model-y-growth',
    'Model Y Growth',
    'Modelled on the electric crossover segment, pairing sedan efficiency with SUV interior volume. A mid-tier entry amount over the same four-period term.',
    'Tesla Model Y',
    'Electric SUV',
    'USD',
    250000,    -- $2,500
    30,
    90000,     -- $900 per period
    4,
    360000,    -- $3,600                      (900 x 4)
    250000,    -- $2,500
    610000,    -- $6,100                      (2,500 + 3,600)
    'coming_soon',
    '/images/investments/model-y-growth.webp',
    false,
    20
  ),
  (
    'model-s-premium',
    'Model S Premium',
    'Modelled on the long-range performance sedan segment, where range, aerodynamics and drivetrain output are pushed hardest.',
    'Tesla Model S',
    'Performance Sedan',
    'USD',
    500000,    -- $5,000
    30,
    180000,    -- $1,800 per period
    4,
    720000,    -- $7,200                      (1,800 x 4)
    500000,    -- $5,000
    1220000,   -- $12,200                     (5,000 + 7,200)
    'coming_soon',
    '/images/investments/model-s-premium.webp',
    false,
    30
  ),
  (
    'model-x-elite',
    'Model X Elite',
    'Modelled on the full-size electric SUV segment — three rows, high towing capability and the largest battery packs in the category.',
    'Tesla Model X',
    'Electric SUV',
    'USD',
    1000000,   -- $10,000
    30,
    350000,    -- $3,500 per period
    4,
    1400000,   -- $14,000                     (3,500 x 4)
    1000000,   -- $10,000
    2400000,   -- $24,000                     (10,000 + 14,000)
    'coming_soon',
    '/images/investments/model-x-elite.webp',
    false,
    40
  ),
  (
    'cybertruck-executive',
    'Cybertruck Executive',
    'The highest entry amount on the platform, modelled on the electric light-truck segment pushing electrification into commercial and utility use.',
    'Tesla Cybertruck',
    'Electric Truck',
    'USD',
    2500000,   -- $25,000
    30,
    800000,    -- $8,000 per period
    4,
    3200000,   -- $32,000                     (8,000 x 4)
    2500000,   -- $25,000
    5700000,   -- $57,000                     (25,000 + 32,000)
    'coming_soon',
    '/images/investments/cybertruck-executive.webp',
    false,
    50
  )
on conflict (slug) do update
  set name = excluded.name,
      summary = excluded.summary,
      vehicle_model = excluded.vehicle_model,
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
      image_url = excluded.image_url,
      featured = excluded.featured,
      sort_order = excluded.sort_order;

-- Exactly one featured plan. Two would make the marketplace's "featured first"
-- ordering non-deterministic and put two Featured badges on one screen.
create unique index if not exists investment_plans_single_featured_idx
  on public.investment_plans ((featured))
  where featured;

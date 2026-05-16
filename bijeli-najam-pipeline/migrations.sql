-- Run this in Supabase SQL editor (Dashboard → SQL Editor → New query)
-- Run sections in order.

-- 1. registered_units
create table if not exists registered_units (
  id              uuid primary key default gen_random_uuid(),
  source          text not null default 'accommodation.croatia.hr',
  name            text not null,
  address         text,
  street          text,
  number          text,
  neighborhood    text,
  city            text not null default 'Split',
  owner           text,
  stars           int,
  beds            int,
  category        text,
  tourist_board   text default 'Turistička zajednica grada Split',
  url             text unique,
  lat             double precision,
  lon             double precision,
  raw_address     text,
  scraped_at      timestamptz not null default now()
);
create index if not exists idx_registered_units_city_nb on registered_units (city, neighborhood);
create index if not exists idx_registered_units_latlon on registered_units (lat, lon);

-- 2. candidate_listings
create table if not exists candidate_listings (
  id              uuid primary key default gen_random_uuid(),
  platform        text not null,
  external_id     text not null,
  title           text not null,
  host_name       text,
  neighborhood    text,
  city            text not null default 'Split',
  approx_lat      double precision,
  approx_lon      double precision,
  url             text not null,
  price_per_night numeric,
  beds            int,
  guests          int,
  photos          jsonb,
  scraped_at      timestamptz not null default now(),
  unique (platform, external_id)
);
create index if not exists idx_candidate_listings_city_nb on candidate_listings (city, neighborhood);
create index if not exists idx_candidate_listings_latlon on candidate_listings (approx_lat, approx_lon);

-- 3. agent_traces (must exist before entity_links references it)
create table if not exists agent_traces (
  id                  uuid primary key default gen_random_uuid(),
  candidate_id        uuid references candidate_listings(id) on delete cascade,
  agent_type          text not null,
  model               text not null,
  step_count          int not null,
  final_verdict       text not null,
  final_confidence    numeric not null,
  final_breakdown     jsonb not null,
  evidence_chain      jsonb not null,
  total_tokens        int,
  total_cost_usd      numeric,
  started_at          timestamptz not null,
  completed_at        timestamptz not null
);

-- 4. trace_steps
create table if not exists trace_steps (
  id                  uuid primary key default gen_random_uuid(),
  trace_id            uuid references agent_traces(id) on delete cascade,
  step_index          int not null,
  tool_called         text not null,
  tool_input          jsonb not null,
  tool_output         jsonb not null,
  why                 text not null,
  updated_hypothesis  text not null,
  confidence_delta    numeric not null,
  duration_ms         int,
  unique (trace_id, step_index)
);
create index if not exists idx_trace_steps_trace_id on trace_steps (trace_id, step_index);

-- 5. entity_links
create table if not exists entity_links (
  id                  uuid primary key default gen_random_uuid(),
  candidate_id        uuid references candidate_listings(id) on delete cascade unique,
  registered_id       uuid references registered_units(id),
  verdict             text not null,
  confidence          numeric not null,
  match_signals       jsonb not null,
  composite_key       jsonb,
  trace_id            uuid references agent_traces(id),
  matched_at          timestamptz not null default now()
);
create index if not exists idx_entity_links_verdict on entity_links (verdict, confidence);

-- 6. flags
create table if not exists flags (
  id                  uuid primary key default gen_random_uuid(),
  candidate_id        uuid references candidate_listings(id) on delete cascade unique,
  entity_link_id      uuid references entity_links(id) on delete cascade,
  trace_id            uuid references agent_traces(id) on delete cascade,
  confidence_unregistered numeric not null,
  status              text not null default 'open',
  evidence_pdf_url    text,
  screenshot_url      text,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_flags_status_confidence on flags (status, confidence_unregistered desc);

-- 7. neighborhoods
create table if not exists neighborhoods (
  slug                text primary key,
  name                text not null,
  city                text not null default 'Split',
  geojson             jsonb,
  flag_count          int not null default 0,
  registered_count    int not null default 0,
  estimated_annual_loss_eur numeric not null default 0
);

-- Seed neighborhoods
insert into neighborhoods (slug, name, city) values
  ('veli-varos', 'Veli Varoš', 'Split'),
  ('mali-varos', 'Mali Varoš', 'Split'),
  ('bacvice', 'Bačvice', 'Split'),
  ('spinut', 'Spinut', 'Split'),
  ('znjan', 'Žnjan', 'Split'),
  ('firule', 'Firule', 'Split'),
  ('sucidar', 'Sućidar', 'Split'),
  ('trstenik', 'Trstenik', 'Split'),
  ('lovret', 'Lovret', 'Split'),
  ('meje', 'Meje', 'Split'),
  ('kman', 'Kman', 'Split'),
  ('mejasi', 'Mejaši', 'Split'),
  ('plokite', 'Plokite', 'Split'),
  ('grad', 'Grad', 'Split'),
  ('kopilica', 'Kopilica', 'Split')
on conflict (slug) do nothing;

-- 8. monitoring_deltas
create table if not exists monitoring_deltas (
  id                  uuid primary key default gen_random_uuid(),
  candidate_id        uuid references candidate_listings(id) on delete cascade,
  delta_type          text not null,
  before_value        jsonb,
  after_value         jsonb,
  detected_at         timestamptz not null default now(),
  triage_verdict      text,
  triage_reason       text,
  is_mock             boolean not null default false
);
create index if not exists idx_monitoring_deltas_candidate on monitoring_deltas (candidate_id, detected_at desc);

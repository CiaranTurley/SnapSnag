-- SnapSnag Financial Automation Schema
-- Run this in Supabase SQL Editor after the other SQL files

-- ─── app_settings: key-value store for server-side config ────────────────────
-- Used for: Xero token storage, competitor results cache
create table if not exists app_settings (
  key   text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function update_app_settings_timestamp()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_settings_updated_at on app_settings;
create trigger app_settings_updated_at
  before update on app_settings
  for each row execute function update_app_settings_timestamp();

-- RLS: only service role can read/write app_settings
alter table app_settings enable row level security;

create policy "Service role only"
  on app_settings
  for all
  using (false)  -- deny all by default; service role bypasses RLS
  with check (false);

-- ─── Add amount_cents and currency to inspections (if not already present) ───
-- These columns are needed for VAT monitoring and Xero integration
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'inspections' and column_name = 'amount_cents'
  ) then
    alter table inspections add column amount_cents integer;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'inspections' and column_name = 'currency'
  ) then
    alter table inspections add column currency text default 'eur';
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'inspections' and column_name = 'xero_invoice_id'
  ) then
    alter table inspections add column xero_invoice_id text;
  end if;
end $$;

-- ─── Add stripe_customer_id to expert_subscriptions (for invoice lookup) ─────
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'expert_subscriptions' and column_name = 'stripe_customer_id'
  ) then
    alter table expert_subscriptions add column stripe_customer_id text;
  end if;
end $$;

-- ─── Indexes ─────────────────────────────────────────────────────────────────
create index if not exists idx_inspections_paid_at on inspections (paid_at)
  where paid_at is not null;

create index if not exists idx_inspections_currency on inspections (currency)
  where paid_at is not null;

create index if not exists idx_expert_subs_stripe_customer on expert_subscriptions (stripe_customer_id)
  where stripe_customer_id is not null;

create index if not exists idx_users_created_at on users (created_at);

-- ─── Supabase Storage: backups bucket ────────────────────────────────────────
-- Run separately in Supabase Dashboard → Storage → Create Bucket:
--   Name: backups
--   Public: NO (private)
--
-- Or via API:
-- insert into storage.buckets (id, name, public) values ('backups', 'backups', false)
-- on conflict do nothing;

-- ─── Notes ───────────────────────────────────────────────────────────────────
-- After running this SQL:
-- 1. Create a 'backups' storage bucket in Supabase Dashboard (private)
-- 2. Visit /api/xero/connect?admin_key=[ADMIN_PASSWORD] to authorise Xero
-- 3. Set XERO_REDIRECT_URI in your Xero app settings to:
--    https://yourdomain.com/api/xero/callback
-- 4. Add all new env vars (see below)
--
-- New env vars required:
--   XERO_CLIENT_ID
--   XERO_CLIENT_SECRET
--   XERO_REDIRECT_URI
--   XERO_ACCOUNT_CODE        (optional, default '200')
--   GOOGLE_API_KEY
--   GOOGLE_CSE_ID
--   OWNER_EMAIL

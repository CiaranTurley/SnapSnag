-- ─── Run this in your Supabase SQL editor ────────────────────────────────────
-- Go to: supabase.com → your project → SQL Editor → paste this → Run

-- Builder portal items table
create table if not exists builder_portal_items (
  id                uuid primary key default gen_random_uuid(),
  inspection_id     uuid not null references inspections(id) on delete cascade,
  checklist_item_id uuid not null references checklist_items(id) on delete cascade,
  status            text not null default 'outstanding'
                      check (status in ('outstanding', 'fixed', 'in_progress', 'disputed')),
  dispute_reason    text,
  builder_note      text,
  builder_photo_url text,
  buyer_accepted    boolean,
  buyer_feedback    text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique(checklist_item_id)
);

alter table builder_portal_items enable row level security;

-- Permissive policies: access is gated by verification code at the application level
create policy "Anyone can read builder portal items"
  on builder_portal_items for select using (true);

create policy "Anyone can insert builder portal items"
  on builder_portal_items for insert with check (true);

create policy "Anyone can update builder portal items"
  on builder_portal_items for update using (true);

-- Also create the builder-photos storage bucket
-- Go to: Storage → New bucket → Name: "builder-photos" → Public: ON → Create

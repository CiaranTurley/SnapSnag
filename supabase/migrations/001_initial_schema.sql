-- ═══════════════════════════════════════════════════════════════════════════
-- SnapSnag – Initial Database Schema
-- Run this entire file in the Supabase SQL Editor (supabase.com → your
-- project → SQL Editor → New query → paste this → Run)
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable the pgcrypto extension (used for gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: users
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email            text        NOT NULL UNIQUE,
  name             text,
  country          text,
  created_at       timestamptz DEFAULT now(),
  referral_code    text        UNIQUE,
  referred_by      text,
  credit_balance   integer     DEFAULT 0
);


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: inspections
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inspections (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     uuid        REFERENCES users(id),
  country                     text        NOT NULL,
  property_address_line1      text,
  property_address_line2      text,
  property_city               text,
  property_county             text,
  property_postcode           text,
  property_type               text,
  bedrooms                    integer,
  bathrooms                   integer,
  builder_name                text,
  handover_date               date,
  inspection_date             date,
  inspector_name              text,
  weather_conditions          text,
  construction_type           text,
  inspection_type             text,
  is_managed_development      boolean     DEFAULT false,
  questionnaire_answers       jsonb       DEFAULT '{}',
  contract_inclusions         jsonb       DEFAULT '[]',
  integrated_appliances       jsonb       DEFAULT '[]',
  status                      text        DEFAULT 'in_progress',
  paid_at                     timestamptz,
  stripe_payment_intent_id    text,
  total_items                 integer     DEFAULT 0,
  passed_items                integer     DEFAULT 0,
  failed_items                integer     DEFAULT 0,
  na_items                    integer     DEFAULT 0,
  custom_items                integer     DEFAULT 0,
  inspection_duration_minutes integer     DEFAULT 0,
  verification_code           text        UNIQUE,
  share_token                 text        UNIQUE,
  couple_mode_active          boolean     DEFAULT false,
  couple_share_link           text,
  created_at                  timestamptz DEFAULT now(),
  updated_at                  timestamptz DEFAULT now()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: checklist_items
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS checklist_items (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id           uuid        NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  room                    text        NOT NULL,
  room_order              integer     DEFAULT 0,
  item_description        text        NOT NULL,
  item_order              integer     DEFAULT 0,
  is_custom               boolean     DEFAULT false,
  response                text        CHECK (response IN ('pass', 'fail', 'na')),
  severity                text        CHECK (severity IN ('minor', 'major', 'critical')),
  written_note            text,
  voice_note_transcript   text,
  voice_note_url          text,
  photos                  jsonb       DEFAULT '[]',
  annotated_photos        jsonb       DEFAULT '[]',
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: builder_portal_items
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS builder_portal_items (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_item_id   uuid        REFERENCES checklist_items(id) ON DELETE CASCADE,
  inspection_id       uuid        REFERENCES inspections(id) ON DELETE CASCADE,
  builder_status      text        CHECK (builder_status IN ('fixed', 'in_progress', 'disputed')),
  builder_note        text,
  builder_photo_url   text,
  buyer_accepted      boolean,
  updated_at          timestamptz DEFAULT now()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: expert_subscriptions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expert_subscriptions (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid        REFERENCES users(id),
  stripe_subscription_id  text,
  stripe_customer_id      text,
  plan                    text        CHECK (plan IN ('monthly', 'annual')),
  status                  text        DEFAULT 'active',
  company_name            text,
  company_logo_url        text,
  company_contact_email   text,
  company_phone           text,
  company_website         text,
  current_period_end      timestamptz,
  created_at              timestamptz DEFAULT now()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: support_tickets
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_tickets (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        REFERENCES users(id),
  category    text,
  messages    jsonb       DEFAULT '[]',
  status      text        DEFAULT 'open',
  resolution  text,
  created_at  timestamptz DEFAULT now(),
  resolved_at timestamptz
);


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: gift_cards
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gift_cards (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text        UNIQUE NOT NULL,
  value_cents integer     NOT NULL,
  currency    text        NOT NULL,
  used        boolean     DEFAULT false,
  used_by     uuid        REFERENCES users(id),
  used_at     timestamptz,
  created_at  timestamptz DEFAULT now()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: defect_database (read-only reference data)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS defect_database (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  country          text,
  property_type    text,
  region           text,
  room             text,
  item_description text,
  severity         text,
  created_at       timestamptz DEFAULT now()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- AUTO-UPDATE updated_at TRIGGER
-- Keeps the updated_at column current whenever a row is changed.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_inspections_updated_at
  BEFORE UPDATE ON inspections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_checklist_items_updated_at
  BEFORE UPDATE ON checklist_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_builder_portal_items_updated_at
  BEFORE UPDATE ON builder_portal_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- Users can only read and write their OWN data.
-- defect_database is read-only for everyone.
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable RLS on every table
ALTER TABLE users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections          ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE builder_portal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expert_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_cards           ENABLE ROW LEVEL SECURITY;
ALTER TABLE defect_database      ENABLE ROW LEVEL SECURITY;


-- ── users ────────────────────────────────────────────────────────────────────
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);


-- ── inspections ──────────────────────────────────────────────────────────────
CREATE POLICY "Users can view own inspections"
  ON inspections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own inspections"
  ON inspections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own inspections"
  ON inspections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own inspections"
  ON inspections FOR DELETE
  USING (auth.uid() = user_id);

-- Allow anyone with the share_token to view an inspection (for builder portal)
CREATE POLICY "Public share token access"
  ON inspections FOR SELECT
  USING (share_token IS NOT NULL);


-- ── checklist_items ───────────────────────────────────────────────────────────
CREATE POLICY "Users can view own checklist items"
  ON checklist_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.id = checklist_items.inspection_id
        AND inspections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create checklist items for own inspections"
  ON checklist_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.id = checklist_items.inspection_id
        AND inspections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own checklist items"
  ON checklist_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.id = checklist_items.inspection_id
        AND inspections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own checklist items"
  ON checklist_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.id = checklist_items.inspection_id
        AND inspections.user_id = auth.uid()
    )
  );

-- Allow public read via share token (for builder portal)
CREATE POLICY "Public share token checklist access"
  ON checklist_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.id = checklist_items.inspection_id
        AND inspections.share_token IS NOT NULL
    )
  );


-- ── builder_portal_items ─────────────────────────────────────────────────────
-- Buyers can read; builders write via API route (service role)
CREATE POLICY "Users can view builder portal items for own inspections"
  ON builder_portal_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.id = builder_portal_items.inspection_id
        AND inspections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update builder portal items for own inspections"
  ON builder_portal_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.id = builder_portal_items.inspection_id
        AND inspections.user_id = auth.uid()
    )
  );


-- ── expert_subscriptions ─────────────────────────────────────────────────────
CREATE POLICY "Users can view own subscription"
  ON expert_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription"
  ON expert_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);


-- ── support_tickets ───────────────────────────────────────────────────────────
CREATE POLICY "Users can view own tickets"
  ON support_tickets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tickets"
  ON support_tickets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tickets"
  ON support_tickets FOR UPDATE
  USING (auth.uid() = user_id);


-- ── gift_cards ───────────────────────────────────────────────────────────────
-- Only service-role can insert/update gift cards.
-- Users can only read a card if they used it.
CREATE POLICY "Users can view own used gift cards"
  ON gift_cards FOR SELECT
  USING (auth.uid() = used_by);


-- ── defect_database (read-only for all authenticated users) ──────────────────
CREATE POLICY "Authenticated users can read defect database"
  ON defect_database FOR SELECT
  TO authenticated
  USING (true);


-- ═══════════════════════════════════════════════════════════════════════════
-- STORAGE BUCKETS
-- Create these in: Supabase → Storage → New bucket
-- (or run this SQL — requires the storage extension)
-- ═══════════════════════════════════════════════════════════════════════════

-- inspection-photos bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('inspection-photos', 'inspection-photos', false)
ON CONFLICT (id) DO NOTHING;

-- company-logos bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', false)
ON CONFLICT (id) DO NOTHING;

-- voice-notes bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-notes', 'voice-notes', false)
ON CONFLICT (id) DO NOTHING;


-- Storage RLS: users can only access files in their own folder
CREATE POLICY "Users can upload their own inspection photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'inspection-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view their own inspection photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'inspection-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own inspection photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'inspection-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can upload their own company logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'company-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view their own company logos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can upload their own voice notes"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'voice-notes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view their own voice notes"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'voice-notes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE TABLE IF NOT EXISTS leads (
  id            BIGSERIAL PRIMARY KEY,
  dedupe_key    TEXT UNIQUE NOT NULL,
  company_name  TEXT NOT NULL,
  kvk_number    TEXT,
  branche       TEXT,
  province      TEXT,
  city          TEXT,
  phone         TEXT,
  email         TEXT,
  website       TEXT,
  has_website   BOOLEAN NOT NULL DEFAULT FALSE,
  employees     INTEGER,
  website_score INTEGER,           -- 0-100, NULL als geen website
  is_outdated   BOOLEAN NOT NULL DEFAULT FALSE,
  reason        TEXT,
  reason_tags   TEXT[] DEFAULT '{}',
  motivation    TEXT,
  status        TEXT NOT NULL DEFAULT 'nieuw',   -- nieuw | afgehandeld
  note          TEXT,                            -- vrije notitie (bijv. "gebeld op ...")
  audit         JSONB DEFAULT '{}'::jsonb,
  source        TEXT,
  last_checked  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_province   ON leads (province);
CREATE INDEX IF NOT EXISTS idx_leads_city       ON leads (city);
CREATE INDEX IF NOT EXISTS idx_leads_branche    ON leads (branche);
CREATE INDEX IF NOT EXISTS idx_leads_score      ON leads (website_score);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads (created_at);

-- Idempotente upgrades voor bestaande databases
ALTER TABLE leads ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'nieuw';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS note   TEXT;

-- Fase 1: analyse, scoring, CRM
ALTER TABLE leads ADD COLUMN IF NOT EXISTS analysis_status   TEXT NOT NULL DEFAULT 'nvt';   -- nvt|wacht|bezig|voltooid|mislukt
ALTER TABLE leads ADD COLUMN IF NOT EXISTS analysis_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS analyzed_at       TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS pagespeed         JSONB DEFAULT '{}'::jsonb;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS checks            JSONB DEFAULT '{}'::jsonb;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS talking_points    TEXT[] DEFAULT '{}';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS positive_note     TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS opening_line      TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_score        INTEGER;   -- commerciële kansscore 0-100
ALTER TABLE leads ADD COLUMN IF NOT EXISTS confidence        INTEGER;   -- betrouwbaarheid gegevens 0-100
ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_up_date    DATE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS favorite          BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS contact_person    TEXT;
CREATE INDEX IF NOT EXISTS idx_leads_analysis_status ON leads (analysis_status);
CREATE INDEX IF NOT EXISTS idx_leads_lead_score ON leads (lead_score);

CREATE TABLE IF NOT EXISTS generation_runs (
  id          BIGSERIAL PRIMARY KEY,
  status      TEXT NOT NULL DEFAULT 'pending',   -- pending | running | done | error
  target      INTEGER NOT NULL,
  found       INTEGER NOT NULL DEFAULT 0,
  scanned     INTEGER NOT NULL DEFAULT 0,
  filters     JSONB DEFAULT '{}'::jsonb,
  error       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

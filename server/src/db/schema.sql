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

CREATE TABLE IF NOT EXISTS kundali_matches (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data       JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kundali_matches_created_at_idx
  ON kundali_matches(created_at DESC);

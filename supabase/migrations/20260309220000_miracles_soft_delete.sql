ALTER TABLE miracles ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_miracles_archived ON miracles(archived);

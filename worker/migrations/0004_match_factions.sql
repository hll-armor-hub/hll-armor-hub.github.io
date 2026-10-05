-- Additive: faction names per match (e.g. 'us' / 'nva', 'gb' / 'ger') so the site can label teams
-- without loading Bifrost's match files. NULL for matches stored before this migration until the
-- sync re-reads their list page.
-- SQLite has no ADD COLUMN IF NOT EXISTS: running this a second time fails with
-- "duplicate column name: allied_faction", which is harmless (the columns already exist).
ALTER TABLE matches ADD COLUMN allied_faction TEXT;
ALTER TABLE matches ADD COLUMN axis_faction TEXT;

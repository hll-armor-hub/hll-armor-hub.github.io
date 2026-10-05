-- Additive: match history recorded from Bifrost's live feed (Wardogs has no CRCON records).
-- The CREATE runs first so a re-run still creates the table; SQLite has no ADD COLUMN IF NOT EXISTS,
-- so running this file a second time then stops with "duplicate column name: faction_scores",
-- which is harmless (the columns already exist).

-- One row per in-progress match, folded from live snapshots and deleted when the match is finalized.
-- state is JSON keyed by hashed player id (never raw Steam ids); times are ms epochs.
CREATE TABLE IF NOT EXISTS live_match_state (
  server_key        TEXT NOT NULL,
  match_key         TEXT NOT NULL,              -- Bifrost match id (or map id + start time)
  state             TEXT NOT NULL,
  first_snapshot_at INTEGER NOT NULL DEFAULT 0,
  last_snapshot_at  INTEGER NOT NULL DEFAULT 0,
  last_active_at    INTEGER NOT NULL DEFAULT 0, -- last snapshot with at least one player
  PRIMARY KEY (server_key, match_key)
) WITHOUT ROWID;

ALTER TABLE matches ADD COLUMN faction_scores TEXT;  -- JSON [{name, score, colour}] for 3-faction matches
ALTER TABLE matches ADD COLUMN winner TEXT;          -- faction name with the top score, NULL on a tie
ALTER TABLE player_matches ADD COLUMN cash INTEGER NOT NULL DEFAULT 0;
ALTER TABLE player_totals ADD COLUMN cash INTEGER NOT NULL DEFAULT 0;

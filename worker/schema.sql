-- Safe to re-run: every statement is idempotent.

CREATE TABLE IF NOT EXISTS matches (
  id              TEXT PRIMARY KEY,
  server_key      TEXT NOT NULL,
  map_id          TEXT,             -- layer id, e.g. wdevf_offensiveus_day
  map_base        TEXT,             -- base map id, e.g. wdevf
  map_pretty      TEXT,
  map_base_pretty TEXT,
  game_mode       TEXT,
  attackers       TEXT,
  environment     TEXT,
  image_name      TEXT,
  start           TEXT,             -- ISO 8601 UTC, always toISOString() format
  "end"           TEXT,
  duration_s      INTEGER,
  allied_score    INTEGER,
  axis_score      INTEGER,
  player_count    INTEGER,
  allied_faction  TEXT,             -- e.g. 'us', 'gb', 'sov' (also in migrations/0004_match_factions.sql)
  axis_faction    TEXT,             -- e.g. 'nva', 'ger', 'dak'
  faction_scores  TEXT,             -- JSON [{name, score, colour}], live-recorded servers (also in migrations/0005_live_history.sql)
  winner          TEXT,             -- top-scoring faction name for live-recorded matches, NULL on a tie
  processed       INTEGER NOT NULL DEFAULT 0,  -- 0 pending, 1 done, 2 gave up
  counted         INTEGER NOT NULL DEFAULT 0,  -- 1 if included in aggregates
  attempts        INTEGER NOT NULL DEFAULT 0,
  fetched_at      TEXT
);
CREATE INDEX IF NOT EXISTS idx_matches_server_start ON matches (server_key, start DESC);
CREATE INDEX IF NOT EXISTS idx_matches_pending ON matches (server_key, processed, start DESC);

CREATE TABLE IF NOT EXISTS player_matches (
  match_id           TEXT NOT NULL,
  player_id          TEXT NOT NULL,
  server_key         TEXT NOT NULL,
  name               TEXT,
  side               TEXT,
  platform           TEXT,
  level              INTEGER,
  kills              INTEGER NOT NULL DEFAULT 0,
  deaths             INTEGER NOT NULL DEFAULT 0,
  teamkills          INTEGER NOT NULL DEFAULT 0,
  kills_streak       INTEGER NOT NULL DEFAULT 0,
  time_seconds       INTEGER NOT NULL DEFAULT 0,
  combat             INTEGER NOT NULL DEFAULT 0,
  offense            INTEGER NOT NULL DEFAULT 0,
  defense            INTEGER NOT NULL DEFAULT 0,
  support            INTEGER NOT NULL DEFAULT 0,
  vehicles_destroyed INTEGER NOT NULL DEFAULT 0,
  top_weapons        TEXT,  -- JSON {weapon: kills}, top 5
  most_killed        TEXT,  -- JSON {name: count}, top 3
  death_by           TEXT,  -- JSON {name: count}, top 3
  start              TEXT,
  counted            INTEGER NOT NULL DEFAULT 0,
  cash               INTEGER NOT NULL DEFAULT 0,  -- live-recorded servers (also in migrations/0005_live_history.sql)
  PRIMARY KEY (match_id, player_id)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS idx_pm_period ON player_matches (server_key, counted, start);
CREATE INDEX IF NOT EXISTS idx_pm_player ON player_matches (player_id, server_key, start DESC);

CREATE TABLE IF NOT EXISTS players (
  player_id  TEXT PRIMARY KEY,
  last_name  TEXT,
  platform   TEXT,
  first_seen TEXT,
  last_seen  TEXT,
  matches    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_players_name ON players (last_name COLLATE NOCASE);

-- Every name a player has used, for search across name changes.
CREATE TABLE IF NOT EXISTS player_names (
  player_id TEXT NOT NULL,
  name      TEXT NOT NULL,
  last_seen TEXT,
  PRIMARY KEY (player_id, name)
) WITHOUT ROWID;

-- Per-server all-time totals, maintained incrementally (counted matches only).
CREATE TABLE IF NOT EXISTS player_totals (
  server_key         TEXT NOT NULL,
  player_id          TEXT NOT NULL,
  matches            INTEGER NOT NULL DEFAULT 0,
  kills              INTEGER NOT NULL DEFAULT 0,
  deaths             INTEGER NOT NULL DEFAULT 0,
  teamkills          INTEGER NOT NULL DEFAULT 0,
  time_seconds       INTEGER NOT NULL DEFAULT 0,
  combat             INTEGER NOT NULL DEFAULT 0,
  offense            INTEGER NOT NULL DEFAULT 0,
  defense            INTEGER NOT NULL DEFAULT 0,
  support            INTEGER NOT NULL DEFAULT 0,
  vehicles_destroyed INTEGER NOT NULL DEFAULT 0,
  best_streak        INTEGER NOT NULL DEFAULT 0,
  first_seen         TEXT,
  last_seen          TEXT,
  cash               INTEGER NOT NULL DEFAULT 0,  -- live-recorded servers (also in migrations/0005_live_history.sql)
  PRIMARY KEY (server_key, player_id)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS player_weapons (
  player_id  TEXT NOT NULL,
  server_key TEXT NOT NULL,
  weapon     TEXT NOT NULL,
  kills      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (player_id, server_key, weapon)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS sync_state (
  key   TEXT PRIMARY KEY,
  value TEXT
);

-- Also in migrations/0002_live_cache.sql for existing databases.
CREATE TABLE IF NOT EXISTS live_cache (
  server_key    TEXT PRIMARY KEY,
  payload       TEXT,                        -- JSON summary (no player names/ids)
  fetched_at    INTEGER NOT NULL DEFAULT 0,  -- ms epoch of last successful fetch
  attempted_at  INTEGER NOT NULL DEFAULT 0,  -- ms epoch of last fetch claim (success or not)
  backoff_until INTEGER NOT NULL DEFAULT 0,  -- ms epoch; no fetches before this
  last_error    TEXT
);

-- Also in migrations/0003_potw_privacy_cache.sql for existing databases.
-- Players hidden from leaderboard, search, Player of the Week, profiles and cards.
-- server_key '*' hides the player on every server.
CREATE TABLE IF NOT EXISTS hidden_players (
  player_id  TEXT NOT NULL,
  server_key TEXT NOT NULL DEFAULT '*',
  hidden_at  TEXT,
  PRIMARY KEY (player_id, server_key)
) WITHOUT ROWID;

-- Also in migrations/0005_live_history.sql for existing databases.
-- One row per in-progress match on a live-recorded server (Wardogs), folded from live snapshots and
-- deleted when the match is finalized. state is JSON keyed by hashed player id (never raw Steam ids).
CREATE TABLE IF NOT EXISTS live_match_state (
  server_key        TEXT NOT NULL,
  match_key         TEXT NOT NULL,              -- Bifrost match id (or map id + start time)
  state             TEXT NOT NULL,
  first_snapshot_at INTEGER NOT NULL DEFAULT 0, -- ms epoch
  last_snapshot_at  INTEGER NOT NULL DEFAULT 0, -- ms epoch
  last_active_at    INTEGER NOT NULL DEFAULT 0, -- ms epoch of the last snapshot with players
  PRIMARY KEY (server_key, match_key)
) WITHOUT ROWID;

-- One row per cached payload ('potw:<server>', 'discord'). attempted_at is claimed atomically
-- so only one request per window (across all isolates) recomputes or refetches.
CREATE TABLE IF NOT EXISTS kv_cache (
  key          TEXT PRIMARY KEY,
  payload      TEXT,
  fetched_at   INTEGER NOT NULL DEFAULT 0,  -- ms epoch of last successful refresh
  attempted_at INTEGER NOT NULL DEFAULT 0,  -- ms epoch of last refresh claim
  last_error   TEXT
);

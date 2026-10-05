-- Additive: privacy opt-outs and a small shared cache for computed/fetched payloads.

-- Players hidden from leaderboard, search, Player of the Week, profiles and cards.
-- server_key '*' hides the player on every server.
CREATE TABLE IF NOT EXISTS hidden_players (
  player_id  TEXT NOT NULL,
  server_key TEXT NOT NULL DEFAULT '*',
  hidden_at  TEXT,
  PRIMARY KEY (player_id, server_key)
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

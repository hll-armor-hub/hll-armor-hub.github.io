-- Additive: last Bifrost live snapshot per server, shared by every Worker isolate so the
-- live feed is fetched at most once per LIVE_CACHE_SECONDS (>= 45s) per server.
CREATE TABLE IF NOT EXISTS live_cache (
  server_key    TEXT PRIMARY KEY,
  payload       TEXT,                        -- JSON summary (no player names/ids)
  fetched_at    INTEGER NOT NULL DEFAULT 0,  -- ms epoch of last successful fetch
  attempted_at  INTEGER NOT NULL DEFAULT 0,  -- ms epoch of last fetch claim (success or not)
  backoff_until INTEGER NOT NULL DEFAULT 0,  -- ms epoch; no fetches before this
  last_error    TEXT
);

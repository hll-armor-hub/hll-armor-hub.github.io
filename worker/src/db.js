// Bulk writes pass one JSON array parameter and expand it with json_each, which keeps
// each match to a handful of statements (D1 caps queries per invocation and bound
// parameters per query at 100).

// Live-recorded history needs migration 0005. A positive check is cached for the isolate's
// lifetime, a negative one for a few minutes, so a missing migration costs one tiny read now and then.
const SCHEMA_RECHECK_MS = 5 * 60 * 1000;
let liveSchema = { ok: false, at: 0 };

export async function liveSchemaReady(db) {
  if (liveSchema.ok || Date.now() - liveSchema.at < SCHEMA_RECHECK_MS) return liveSchema.ok;
  let ok = false;
  try {
    const { results } = await db
      .prepare(
        `SELECT name, sql FROM sqlite_master WHERE type = 'table'
         AND name IN ('live_match_state', 'matches', 'player_matches', 'player_totals')`
      )
      .all();
    const sql = Object.fromEntries(results.map((r) => [r.name, String(r.sql || '')]));
    ok =
      'live_match_state' in sql &&
      /\bfaction_scores\b/.test(sql.matches || '') &&
      /\bwinner\b/.test(sql.matches || '') &&
      /\bcash\b/.test(sql.player_matches || '') &&
      /\bcash\b/.test(sql.player_totals || '');
  } catch {
    ok = false;
  }
  liveSchema = { ok, at: Date.now() };
  return ok;
}

export async function getState(db, key) {
  const row = await db.prepare('SELECT value FROM sync_state WHERE key = ?').bind(key).first();
  return row ? row.value : null;
}

export function setStateStmt(db, key, value) {
  return db
    .prepare('INSERT INTO sync_state (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .bind(key, value == null ? null : String(value));
}

export async function setState(db, key, value) {
  await setStateStmt(db, key, value).run();
}

export async function getStates(db, keys) {
  const { results } = await db
    .prepare('SELECT key, value FROM sync_state WHERE key IN (SELECT value FROM json_each(?))')
    .bind(JSON.stringify(keys))
    .all();
  return Object.fromEntries(results.map((r) => [r.key, r.value]));
}

export async function acquireLock(db, ttlMs) {
  const now = Date.now();
  const res = await db
    .prepare(
      `INSERT INTO sync_state (key, value) VALUES ('lock', ?1)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value
       WHERE CAST(sync_state.value AS INTEGER) < ?2`
    )
    .bind(String(now), now - ttlMs)
    .run();
  return res.meta.changes > 0;
}

export async function releaseLock(db) {
  await db.prepare("DELETE FROM sync_state WHERE key = 'lock'").run();
}

export async function existingMatchIds(db, ids) {
  if (!ids.length) return new Set();
  const { results } = await db
    .prepare('SELECT id FROM matches WHERE id IN (SELECT value FROM json_each(?))')
    .bind(JSON.stringify(ids))
    .all();
  return new Set(results.map((r) => r.id));
}

/** Inserts new list rows; for rows already stored it only fills in missing faction names. */
export function upsertMatchesStmt(db, rows) {
  return db
    .prepare(
      `INSERT INTO matches
         (id, server_key, map_id, map_base, map_pretty, map_base_pretty, game_mode, attackers,
          environment, image_name, start, "end", duration_s, allied_score, axis_score,
          allied_faction, axis_faction)
       SELECT j.value ->> '$.id', j.value ->> '$.serverKey', j.value ->> '$.mapId', j.value ->> '$.mapBase',
              j.value ->> '$.mapPretty', j.value ->> '$.mapBasePretty', j.value ->> '$.gameMode',
              j.value ->> '$.attackers', j.value ->> '$.environment', j.value ->> '$.imageName',
              j.value ->> '$.start', j.value ->> '$.end', j.value ->> '$.durationS',
              j.value ->> '$.alliedScore', j.value ->> '$.axisScore',
              j.value ->> '$.alliedFaction', j.value ->> '$.axisFaction'
       FROM json_each(?1) AS j WHERE true
       ON CONFLICT(id) DO UPDATE SET
         allied_faction = COALESCE(matches.allied_faction, excluded.allied_faction),
         axis_faction   = COALESCE(matches.axis_faction, excluded.axis_faction)
       WHERE (matches.allied_faction IS NULL AND excluded.allied_faction IS NOT NULL)
          OR (matches.axis_faction IS NULL AND excluded.axis_faction IS NOT NULL)`
    )
    .bind(JSON.stringify(rows));
}

export async function giveUpStaleMatches(db, serverKey, maxAttempts) {
  await db
    .prepare('UPDATE matches SET processed = 2 WHERE server_key = ?1 AND processed = 0 AND attempts >= ?2')
    .bind(serverKey, maxAttempts)
    .run();
}

export async function pendingMatches(db, serverKey, limit) {
  if (limit <= 0) return [];
  const { results } = await db
    .prepare(
      `SELECT id, map_id, start, duration_s FROM matches
       WHERE server_key = ?1 AND processed = 0
       ORDER BY start DESC LIMIT ?2`
    )
    .bind(serverKey, limit)
    .all();
  return results;
}

// Bumped before fetching so a run killed mid-match (e.g. CPU limit) can't wedge the queue.
export async function bumpAttempts(db, ids) {
  if (!ids.length) return;
  await db
    .prepare('UPDATE matches SET attempts = attempts + 1 WHERE id IN (SELECT value FROM json_each(?))')
    .bind(JSON.stringify(ids))
    .run();
}

export async function markMatch(db, id, processed) {
  await db
    .prepare('UPDATE matches SET processed = ?2, fetched_at = ?3 WHERE id = ?1')
    .bind(id, processed, new Date().toISOString())
    .run();
}

/**
 * All writes for one processed match, executed as a single D1 batch (one transaction),
 * so aggregates are incremented exactly once per match.
 */
export function matchWriteStmts(db, { match, serverKey, players, weapons, counted, alliedScore, axisScore, alliedFaction, axisFaction }) {
  const start = match.start;
  const playersJson = JSON.stringify(players);
  const stmts = [
    db
      .prepare(
        `INSERT OR IGNORE INTO player_matches
           (match_id, player_id, server_key, name, side, platform, level, kills, deaths, teamkills,
            kills_streak, time_seconds, combat, offense, defense, support, vehicles_destroyed,
            top_weapons, most_killed, death_by, start, counted)
         SELECT ?2, j.value ->> '$.id', ?3, j.value ->> '$.name', j.value ->> '$.side', j.value ->> '$.platform',
                j.value ->> '$.level', j.value ->> '$.kills', j.value ->> '$.deaths', j.value ->> '$.teamkills',
                j.value ->> '$.streak', j.value ->> '$.time', j.value ->> '$.combat', j.value ->> '$.offense',
                j.value ->> '$.defense', j.value ->> '$.support', j.value ->> '$.vehicles',
                j.value ->> '$.topWeapons', j.value ->> '$.mostKilled', j.value ->> '$.deathBy', ?4, ?5
         FROM json_each(?1) AS j`
      )
      .bind(playersJson, match.id, serverKey, start, counted ? 1 : 0),
  ];

  if (counted) {
    stmts.push(
      db
        .prepare(
          `INSERT INTO players (player_id, last_name, platform, first_seen, last_seen, matches)
           SELECT j.value ->> '$.id', j.value ->> '$.name', j.value ->> '$.platform', ?2, ?2, 1
           FROM json_each(?1) AS j WHERE true
           ON CONFLICT(player_id) DO UPDATE SET
             last_name  = CASE WHEN excluded.last_seen >= players.last_seen THEN excluded.last_name ELSE players.last_name END,
             platform   = CASE WHEN excluded.last_seen >= players.last_seen THEN COALESCE(excluded.platform, players.platform) ELSE players.platform END,
             first_seen = MIN(players.first_seen, excluded.first_seen),
             last_seen  = MAX(players.last_seen, excluded.last_seen),
             matches    = players.matches + 1`
        )
        .bind(playersJson, start),
      db
        .prepare(
          `INSERT INTO player_names (player_id, name, last_seen)
           SELECT j.value ->> '$.id', j.value ->> '$.name', ?2
           FROM json_each(?1) AS j WHERE j.value ->> '$.name' IS NOT NULL
           ON CONFLICT(player_id, name) DO UPDATE SET last_seen = MAX(player_names.last_seen, excluded.last_seen)`
        )
        .bind(playersJson, start),
      db
        .prepare(
          `INSERT INTO player_totals
             (server_key, player_id, matches, kills, deaths, teamkills, time_seconds, combat, offense,
              defense, support, vehicles_destroyed, best_streak, first_seen, last_seen)
           SELECT ?2, j.value ->> '$.id', 1, j.value ->> '$.kills', j.value ->> '$.deaths', j.value ->> '$.teamkills',
                  j.value ->> '$.time', j.value ->> '$.combat', j.value ->> '$.offense', j.value ->> '$.defense',
                  j.value ->> '$.support', j.value ->> '$.vehicles', j.value ->> '$.streak', ?3, ?3
           FROM json_each(?1) AS j WHERE true
           ON CONFLICT(server_key, player_id) DO UPDATE SET
             matches            = player_totals.matches + 1,
             kills              = player_totals.kills + excluded.kills,
             deaths             = player_totals.deaths + excluded.deaths,
             teamkills          = player_totals.teamkills + excluded.teamkills,
             time_seconds       = player_totals.time_seconds + excluded.time_seconds,
             combat             = player_totals.combat + excluded.combat,
             offense            = player_totals.offense + excluded.offense,
             defense            = player_totals.defense + excluded.defense,
             support            = player_totals.support + excluded.support,
             vehicles_destroyed = player_totals.vehicles_destroyed + excluded.vehicles_destroyed,
             best_streak        = MAX(player_totals.best_streak, excluded.best_streak),
             first_seen         = MIN(player_totals.first_seen, excluded.first_seen),
             last_seen          = MAX(player_totals.last_seen, excluded.last_seen)`
        )
        .bind(playersJson, serverKey, start)
    );
    if (weapons.length) {
      stmts.push(
        db
          .prepare(
            `INSERT INTO player_weapons (player_id, server_key, weapon, kills)
             SELECT j.value ->> '$[0]', ?2, j.value ->> '$[1]', j.value ->> '$[2]'
             FROM json_each(?1) AS j WHERE true
             ON CONFLICT(player_id, server_key, weapon) DO UPDATE SET kills = player_weapons.kills + excluded.kills`
          )
          .bind(JSON.stringify(weapons), serverKey)
      );
    }
  }

  stmts.push(
    db
      .prepare(
        `UPDATE matches SET processed = 1, counted = ?2, player_count = ?3,
           allied_score = COALESCE(?4, allied_score), axis_score = COALESCE(?5, axis_score), fetched_at = ?6,
           allied_faction = COALESCE(allied_faction, ?7), axis_faction = COALESCE(axis_faction, ?8)
         WHERE id = ?1`
      )
      .bind(
        match.id, counted ? 1 : 0, players.length, alliedScore, axisScore, new Date().toISOString(),
        alliedFaction ?? null, axisFaction ?? null
      )
  );
  return stmts;
}

/**
 * All writes for one match recorded from the live feed (see fold.js finalRows), as one D1 batch.
 * Aggregates run first and only while the match row doesn't exist yet, and the match row is
 * inserted last, so replaying the same match can never count it twice.
 */
export function liveMatchWriteStmts(db, { match, players, counted }) {
  const playersJson = JSON.stringify(players);
  const fresh = 'NOT EXISTS (SELECT 1 FROM matches WHERE id = ?3)';
  const stmts = [];
  if (counted) {
    stmts.push(
      db
        .prepare(
          `INSERT INTO players (player_id, last_name, platform, first_seen, last_seen, matches)
           SELECT j.value ->> '$.id', j.value ->> '$.name', NULL, ?2, ?2, 1
           FROM json_each(?1) AS j WHERE ${fresh}
           ON CONFLICT(player_id) DO UPDATE SET
             last_name  = CASE WHEN excluded.last_seen >= players.last_seen THEN COALESCE(excluded.last_name, players.last_name) ELSE players.last_name END,
             first_seen = MIN(players.first_seen, excluded.first_seen),
             last_seen  = MAX(players.last_seen, excluded.last_seen),
             matches    = players.matches + 1`
        )
        .bind(playersJson, match.start, match.id),
      db
        .prepare(
          `INSERT INTO player_names (player_id, name, last_seen)
           SELECT j.value ->> '$.id', j.value ->> '$.name', ?2
           FROM json_each(?1) AS j WHERE j.value ->> '$.name' IS NOT NULL AND ${fresh}
           ON CONFLICT(player_id, name) DO UPDATE SET last_seen = MAX(player_names.last_seen, excluded.last_seen)`
        )
        .bind(playersJson, match.start, match.id),
      db
        .prepare(
          `INSERT INTO player_totals (server_key, player_id, matches, kills, deaths, time_seconds, cash, first_seen, last_seen)
           SELECT ?2, j.value ->> '$.id', 1, j.value ->> '$.kills', j.value ->> '$.deaths', j.value ->> '$.time',
                  j.value ->> '$.cash', ?4, ?4
           FROM json_each(?1) AS j WHERE ${fresh}
           ON CONFLICT(server_key, player_id) DO UPDATE SET
             matches      = player_totals.matches + 1,
             kills        = player_totals.kills + excluded.kills,
             deaths       = player_totals.deaths + excluded.deaths,
             time_seconds = player_totals.time_seconds + excluded.time_seconds,
             cash         = player_totals.cash + excluded.cash,
             first_seen   = MIN(player_totals.first_seen, excluded.first_seen),
             last_seen    = MAX(player_totals.last_seen, excluded.last_seen)`
        )
        .bind(playersJson, match.serverKey, match.id, match.start)
    );
  }
  stmts.push(
    db
      .prepare(
        `INSERT OR IGNORE INTO player_matches
           (match_id, player_id, server_key, name, side, kills, deaths, time_seconds, cash, start, counted)
         SELECT ?2, j.value ->> '$.id', ?3, j.value ->> '$.name', j.value ->> '$.side', j.value ->> '$.kills',
                j.value ->> '$.deaths', j.value ->> '$.time', j.value ->> '$.cash', ?4, ?5
         FROM json_each(?1) AS j WHERE NOT EXISTS (SELECT 1 FROM matches WHERE id = ?2)`
      )
      .bind(playersJson, match.id, match.serverKey, match.start, counted ? 1 : 0),
    db
      .prepare(
        `INSERT OR IGNORE INTO matches
           (id, server_key, map_id, map_base, map_pretty, map_base_pretty, game_mode, environment, start, "end",
            duration_s, player_count, faction_scores, winner, processed, counted, fetched_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, 1, ?15, ?16)`
      )
      .bind(
        match.id, match.serverKey, match.mapId, match.mapBase, match.mapPretty, match.mapBasePretty, match.gameMode,
        match.environment, match.start, match.end, match.durationS, match.playerCount, match.factionScores,
        match.winner, counted ? 1 : 0, new Date().toISOString()
      )
  );
  return stmts;
}

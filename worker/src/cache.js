// D1-backed payload cache (kv_cache table) shared by every isolate. Like live_cache, a single
// atomic claim on attempted_at decides which request may refresh, so each key is recomputed or
// refetched at most once per window no matter how many visitors arrive at once.

// Per-isolate reuse of the D1 read, so bursts of visitors don't each query D1.
const MEM_TTL_MS = 30 * 1000;
const mem = new Map();

function parse(text) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

async function claim(db, key, now, retryMs) {
  const res = await db
    .prepare(
      `INSERT INTO kv_cache (key, attempted_at) VALUES (?1, ?2)
       ON CONFLICT(key) DO UPDATE SET attempted_at = excluded.attempted_at
       WHERE kv_cache.attempted_at <= ?3`
    )
    .bind(key, now, now - retryMs)
    .run();
  return res.meta.changes > 0;
}

/**
 * Returns { payload, fetchedAt (ms), stale, error }. `refresh` runs only when the cached payload is
 * older than ttlMs and this caller wins the claim; failed refreshes are retried after retryMs and
 * the previous payload keeps being served with stale: true.
 */
export async function cachedPayload(db, key, { ttlMs, retryMs = ttlMs, refresh }) {
  const now = Date.now();
  const hit = mem.get(key);
  if (hit && now - hit.at < Math.min(MEM_TTL_MS, ttlMs)) return hit.value;

  const row = await db
    .prepare('SELECT payload, fetched_at, attempted_at, last_error FROM kv_cache WHERE key = ?1')
    .bind(key)
    .first();
  const payload = parse(row?.payload);
  let value;
  if (payload && now - row.fetched_at < ttlMs) {
    value = { payload, fetchedAt: row.fetched_at, stale: false, error: null };
  } else if ((!row || now - row.attempted_at >= retryMs) && (await claim(db, key, now, retryMs))) {
    try {
      const fresh = await refresh();
      await db
        .prepare('UPDATE kv_cache SET payload = ?2, fetched_at = ?3, last_error = NULL WHERE key = ?1')
        .bind(key, JSON.stringify(fresh), now)
        .run();
      value = { payload: fresh, fetchedAt: now, stale: false, error: null };
    } catch (err) {
      const message = String(err.message || err).slice(0, 200);
      console.error(`cache ${key}:`, message);
      await db.prepare('UPDATE kv_cache SET last_error = ?2 WHERE key = ?1').bind(key, message).run();
      value = { payload, fetchedAt: row?.fetched_at || null, stale: true, error: message };
    }
  } else {
    value = { payload, fetchedAt: row?.fetched_at || null, stale: true, error: row?.last_error || null };
  }
  mem.set(key, { value, at: Date.now() });
  return value;
}

/** Drops cached payloads whose key starts with `prefix` (in D1 and this isolate). */
export async function invalidate(db, prefix) {
  for (const k of mem.keys()) if (k.startsWith(prefix)) mem.delete(k);
  await db.prepare("DELETE FROM kv_cache WHERE key LIKE ?1 ESCAPE '\\'").bind(prefix.replace(/[\\%_]/g, (c) => '\\' + c) + '%').run();
}

// Production can run this code before migration 0005: the recorder must not fetch or throw, and
// aho-wd endpoints must answer like a server without history. (Own file = own process, so the
// per-isolate schema check starts uncached.)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { leaderboard, listMatches, matchDetail, playerProfile, searchPlayers, serverSummary } from '../src/api.js';
import { playerCard } from '../src/card.js';
import { refreshLive } from '../src/live.js';
import { playerOfTheWeek } from '../src/potw.js';
import { runRecorder } from '../src/recorder.js';
import { D1 } from './d1shim.mjs';
import { liveDoc } from './synthetic.mjs';

const SCHEMA = fileURLToPath(new URL('../schema.sql', import.meta.url));
const SERVER = { key: 'aho-wd', game: 'wd', name: 'Wardogs', bifrostId: '96fabd0b-b739-498b-906b-16ac0529b0a3', historySource: 'live' };

/** schema.sql as it was before 0005 (0002-0004 applied). */
function preMigrationDb() {
  const sql = readFileSync(SCHEMA, 'utf8')
    .replace(/^[ \t]*(faction_scores|winner|cash)[ \t]+[^\n]*\n/gm, '')
    .replace(/CREATE TABLE IF NOT EXISTS live_match_state \([\s\S]*?\) WITHOUT ROWID;/, '');
  const d = new D1();
  d.sqlite.exec(sql);
  return d;
}

test('without migration 0005: recorder skips before fetching, endpoints return the no-history shape', async () => {
  const db = preMigrationDb();
  assert.equal(db.rows("SELECT COUNT(*) AS n FROM sqlite_master WHERE name = 'live_match_state'")[0].n, 0);
  const env = { DB: db, SERVERS: JSON.stringify([SERVER]), PLAYER_ID_SALT: 'unit-test-salt-0123456789abcdef' };
  const realFetch = globalThis.fetch;
  const calls = [];
  const now = Date.now();
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return new Response(JSON.stringify(liveDoc({ matchId: 'm', start: now - 600_000, at: now - 1000, players: [{ i: 1 }] })), {
      headers: { 'Content-Type': 'application/json' },
    });
  };
  try {
    const r = await runRecorder(env);
    assert.deepEqual(r, [{ skipped: 'migration 0005 not applied' }]);
    assert.equal(calls.length, 0, 'cron does not poll Bifrost while the recorder is blocked');

    // A visitor's /v1/live fetch still works and skips recording quietly.
    const s = await refreshLive(env, SERVER);
    assert.equal(calls.length, 1);
    assert.equal(s.players, 1);
    assert.equal(s.stale, false);

    const p = (o) => new URLSearchParams({ server: 'aho-wd', ...o });
    assert.equal((await serverSummary(env, 'aho-wd')).history, false);
    assert.deepEqual((await leaderboard(env, p({ stat: 'cash' }))).rows, []);
    assert.equal((await searchPlayers(env, p({ q: 'abc' }))).history, false);
    assert.equal((await listMatches(env, p({}))).history, false);
    assert.equal((await playerOfTheWeek(env, p({}))).history, false);
    await assert.rejects(playerProfile(env, 'wd-abc', p({})), (e) => e.status === 404 && e.extra.history === false);
    await assert.rejects(matchDetail(env, 'm-1', p({})), (e) => e.status === 404 && e.extra.history === false);
    assert.equal((await playerCard(env, p({}), 'wd-abc')).status, 404);
    // The negative check is cached: repeated calls don't re-read sqlite_master each time.
    db.queries = 0;
    await serverSummary(env, 'aho-wd');
    await runRecorder(env);
    assert.equal(db.queries, 0);
  } finally {
    globalThis.fetch = realFetch;
  }
});

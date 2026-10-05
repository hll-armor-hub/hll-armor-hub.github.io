// node --test worker/test  (Node 22.5+: uses node:sqlite as a D1 stand-in)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { leaderboard, listMatches, matchDetail, playerProfile, serverSummary } from '../src/api.js';
import { playerCard } from '../src/card.js';
import { finalRows, foldSnapshot, matchIdFor, newState, readSnapshot, winnerOf } from '../src/fold.js';
import { refreshLive } from '../src/live.js';
import { playerOfTheWeek } from '../src/potw.js';
import { finalizeDue, IDLE_FINALIZE_MS, recordSnapshot } from '../src/recorder.js';
import { D1 } from './d1shim.mjs';
import { FACTIONS, liveDoc, matchSequence, steamId } from './synthetic.mjs';

const SCHEMA = fileURLToPath(new URL('../schema.sql', import.meta.url));
const SAMPLE = fileURLToPath(new URL('../tmp/live-wd.json', import.meta.url));
const SERVER = { key: 'aho-wd', game: 'wd', name: 'After Hours Operators | Wardogs', bifrostId: '96fabd0b-b739-498b-906b-16ac0529b0a3', historySource: 'live' };
const SERVERS = JSON.stringify([
  { key: 'aho-hllv', game: 'hllv', name: 'Vietnam', bifrostId: '3b40d468-7833-4694-ac38-4ed3a15c334e' },
  SERVER,
]);
const PLAYER_ID_RE = /^[A-Za-z0-9_.:-]{1,80}$/;
const MIN = 60_000;
const T0 = Date.parse('2026-10-01T18:00:00Z');

function makeEnv() {
  return { DB: D1.withSchema(SCHEMA), SERVERS, PLAYER_ID_SALT: 'unit-test-salt-0123456789abcdef', LIVE_MIN_PLAYERS: '4', LIVE_MIN_MATCH_SECONDS: '300' };
}
const params = (o) => new URLSearchParams(o);
const hashed = (snap) => snap.players.map((p) => ({ ...p, id: `h-${p.rawId}` }));

function allText(db) {
  const tables = db.rows("SELECT name FROM sqlite_master WHERE type = 'table'").map((r) => r.name);
  return tables.map((t) => JSON.stringify(db.rows(`SELECT * FROM "${t}"`))).join('\n');
}

async function feed(env, docs, opts = {}) {
  for (const d of docs) {
    const at = Date.parse(d.sources.gameStateAt);
    await recordSnapshot(env, SERVER, d, at);
    if (opts.finalizeEach) await finalizeDue(env, SERVER, at);
  }
}

// ---------------- pure fold logic ----------------

test('readSnapshot whitelists fields and keeps raw ids only for hashing', () => {
  const doc = JSON.parse(readFileSync(SAMPLE, 'utf8'));
  const snap = readSnapshot(doc, Date.parse(doc.generatedAt));
  assert.equal(snap.key, '574e295b-ea52-551f-9ec8-b5611fc460e4');
  assert.equal(snap.players.length, 8);
  assert.equal(snap.mapName, 'Zestafona');
  assert.equal(snap.mode, 'KOTH');
  assert.deepEqual(snap.factions.map((f) => f.name), ['Lonestar', 'Valkyra', 'Manticore']);
  const keys = new Set(snap.players.flatMap(Object.keys));
  assert.deepEqual([...keys].sort(), ['cash', 'deaths', 'faction', 'kills', 'name', 'rawId']);
  assert.ok(/^7656119\d{10}$/.test(snap.players[0].rawId), 'sample ids are Steam64');
});

test('readSnapshot rejects stale feeds and map transitions; falls back to map + start key', () => {
  const doc = liveDoc({ matchId: 'm1', start: T0, at: T0 + MIN, players: [{ i: 1 }] });
  assert.equal(readSnapshot(doc, T0 + MIN + 11 * MIN), null);
  assert.equal(readSnapshot({ ...doc, match: { ...doc.match, isTransitioning: true } }, T0 + MIN), null);
  const noId = readSnapshot({ ...doc, match: { ...doc.match, matchId: null } }, T0 + MIN);
  assert.equal(noId.key, `${doc.match.mapId}|${new Date(T0).toISOString()}`);
  const fromFactions = readSnapshot({ ...doc, players: undefined }, T0 + MIN);
  assert.equal(fromFactions.players.length, 1);
});

test('fold: players joining and leaving keep their last values; time follows snapshot gaps', () => {
  const at = (m) => T0 + m * MIN;
  const doc = (m, players) => liveDoc({ matchId: 'm1', start: T0, at: at(m), players });
  let state = null;
  const seq = [
    doc(1, [{ i: 1, kills: 1 }, { i: 2, kills: 0 }]),
    doc(2, [{ i: 1, kills: 3, deaths: 1 }, { i: 2, kills: 1 }, { i: 3, kills: 0 }]),
    doc(3, [{ i: 1, kills: 4, deaths: 1, cash: 500 }, { i: 3, kills: 2 }]), // 2 left
    doc(5, [{ i: 1, kills: 6, deaths: 2, cash: 900 }, { i: 3, kills: 2 }]), // 2-minute gap
    doc(16, [{ i: 1, kills: 7, deaths: 2, cash: 1000 }]), // 11-minute gap (backoff) -> capped
  ];
  for (const d of seq) {
    const snap = readSnapshot(d, Date.parse(d.sources.gameStateAt));
    state = state || newState(snap);
    assert.equal(foldSnapshot(state, snap, hashed(snap)), true);
  }
  const p = (i) => state.p[`h-${steamId(i)}`];
  assert.equal(p(2).k, 1, 'player 2 keeps last-seen kills after leaving');
  assert.equal(p(2).s, 2);
  assert.equal(p(1).t, 30 + 60 + 60 + 120 + 120, 'first interval nominal/2, gaps capped at 120s');
  assert.equal(p(3).t, 30 + 60 + 120);
  assert.equal(state.n, 5);
  assert.equal(state.active, at(16));
  // Same or older snapshot is ignored.
  const again = readSnapshot(seq[4], at(16));
  assert.equal(foldSnapshot(state, again, hashed(again)), false);
});

test('fold: counter drops (rejoin or restart with same match id) are banked; cash is a running max', () => {
  const docs = [
    liveDoc({ matchId: 'm1', start: T0, at: T0 + MIN, players: [{ i: 1, kills: 10, deaths: 4, cash: 800 }] }),
    liveDoc({ matchId: 'm1', start: T0, at: T0 + 2 * MIN, players: [{ i: 1, kills: 11, deaths: 4, cash: 300 }] }), // spent cash
    liveDoc({ matchId: 'm1', start: T0, at: T0 + 3 * MIN, players: [{ i: 1, kills: 2, deaths: 1, cash: 200 }] }), // reset
    liveDoc({ matchId: 'm1', start: T0, at: T0 + 4 * MIN, players: [{ i: 1, kills: 3, deaths: 1, cash: 450 }] }),
  ];
  let state = null;
  for (const d of docs) {
    const snap = readSnapshot(d, Date.parse(d.sources.gameStateAt));
    state = state || newState(snap);
    foldSnapshot(state, snap, hashed(snap));
  }
  const rows = finalRows({ ...state, start: new Date(T0 - 10 * MIN).toISOString() }, { serverKey: 'aho-wd', minPlayers: 1 });
  assert.equal(rows.players[0].kills, 11 + 3);
  assert.equal(rows.players[0].deaths, 4 + 1);
  assert.equal(rows.players[0].cash, 800 + 450);
});

test('winnerOf and finalRows rules', () => {
  assert.equal(winnerOf([{ name: 'A', score: 3 }, { name: 'B', score: 5 }, { name: 'C', score: 1 }]), 'B');
  assert.equal(winnerOf([{ name: 'A', score: 5 }, { name: 'B', score: 5 }]), null);
  assert.equal(winnerOf([{ name: 'A', score: 0 }, { name: 'B', score: 0 }]), null);
  assert.equal(winnerOf([]), null);

  const docs = matchSequence({ matchId: 'abc', startMs: T0, minutes: 20, count: 9 });
  let state = null;
  for (const d of docs) {
    const snap = readSnapshot(d, Date.parse(d.sources.gameStateAt));
    state = state || newState(snap);
    foldSnapshot(state, snap, hashed(snap));
  }
  const rows = finalRows(state, { serverKey: 'aho-wd' });
  assert.equal(rows.counted, true);
  assert.equal(rows.match.winner, 'Valkyra');
  assert.equal(rows.match.durationS, 21 * 60);
  assert.equal(rows.match.playerCount, 9);
  assert.equal(rows.match.mapBase, 'zestafona');
  assert.equal(rows.match.gameMode, 'KOTH');
  assert.match(rows.match.id, PLAYER_ID_RE);
  assert.equal(rows.match.id, matchIdFor(state));
  assert.ok(rows.players.every((p) => FACTIONS.some((f) => f.name === p.side)));
  assert.equal(finalRows(state, { serverKey: 'aho-wd', minPlayers: 10 }).counted, false);
  // Too short to keep at all.
  const short = { ...state, start: null, active: state.first + 60_000 };
  assert.equal(finalRows(short, { serverKey: 'aho-wd' }), null);
  // Faction switch: side is the faction played longest.
  const st = newState(readSnapshot(docs[0], Date.parse(docs[0].sources.gameStateAt)));
  st.p.x = { n: 'X', f: 'Manticore', ft: { Lonestar: 600, Manticore: 60 }, k: 1, d: 0, c: 0, bk: 0, bd: 0, bc: 0, t: 660, s: 11, fs: 0, ls: 0 };
  st.active = st.first + 10 * MIN;
  assert.equal(finalRows(st, { serverKey: 'aho-wd', minPlayers: 1 }).players[0].side, 'Lonestar');
});

// ---------------- recorder + D1 ----------------

test('recorder: a full match, then a map change finalizes it with hashed ids only', async () => {
  const env = makeEnv();
  const db = env.DB;
  const a = matchSequence({ matchId: 'match-a', startMs: T0, minutes: 30, count: 12 });
  db.queries = 0;
  await feed(env, a, { finalizeEach: true });
  // Per snapshot: 1 state read + 1 write, plus finalizeDue's key scan (and one cached schema check).
  assert.ok(db.queries <= a.length * 3 + 1, `queries per snapshot ${db.queries / a.length}`);
  assert.equal(db.rows('SELECT COUNT(*) AS n FROM live_match_state')[0].n, 1);
  assert.equal(db.rows('SELECT COUNT(*) AS n FROM matches')[0].n, 0);

  const bStart = T0 + 32 * MIN;
  const b = matchSequence({ matchId: 'match-b', startMs: bStart, minutes: 3, count: 6, firstId: 5, mapId: 'tbilisi_koth', mapName: 'TBILISI (Night)' });
  await feed(env, b.slice(0, 1));
  const fin = await finalizeDue(env, SERVER, bStart + MIN);
  assert.equal(fin.length, 1);
  assert.equal(fin[0].counted, true);

  const [m] = db.rows('SELECT * FROM matches');
  assert.equal(m.server_key, 'aho-wd');
  assert.equal(m.processed, 1);
  assert.equal(m.counted, 1);
  assert.equal(m.winner, 'Valkyra');
  assert.equal(JSON.parse(m.faction_scores).length, 3);
  assert.equal(m.player_count, 12);
  assert.equal(db.rows('SELECT COUNT(*) AS n FROM player_matches')[0].n, 12);
  assert.equal(db.rows("SELECT COUNT(*) AS n FROM player_totals WHERE server_key = 'aho-wd'")[0].n, 12);
  assert.ok(db.rows('SELECT SUM(cash) AS c FROM player_totals')[0].c > 0);
  const ids = db.rows('SELECT player_id FROM players').map((r) => r.player_id);
  assert.ok(ids.every((id) => /^wd-[0-9a-f]{24}$/.test(id)), 'player ids are salted hashes');
  const dump = allText(db);
  assert.ok(!/7656119\d{10}/.test(dump), 'no raw Steam64 id stored anywhere');
  assert.ok(!/vip|guild-admin|ping/i.test(dump), 'no VIP, staff or ping data stored');
  // Match B is still in progress.
  assert.equal(db.rows('SELECT match_key FROM live_match_state')[0].match_key, 'match-b');
});

test('recorder: same Steam id hashes the same; a different salt gives different ids', async () => {
  const env = makeEnv();
  const d = liveDoc({ matchId: 'x', start: T0, at: T0 + MIN, players: [{ i: 1 }] });
  await recordSnapshot(env, SERVER, d, T0 + MIN);
  const k1 = Object.keys(JSON.parse(env.DB.rows('SELECT state FROM live_match_state')[0].state).p)[0];
  const env2 = { ...makeEnv(), PLAYER_ID_SALT: 'another-salt-0123456789abcdef!!' };
  await recordSnapshot(env2, SERVER, d, T0 + MIN);
  const k2 = Object.keys(JSON.parse(env2.DB.rows('SELECT state FROM live_match_state')[0].state).p)[0];
  assert.match(k1, /^wd-[0-9a-f]{24}$/);
  assert.notEqual(k1, k2);
  const noSalt = { ...makeEnv(), PLAYER_ID_SALT: '' };
  assert.match((await recordSnapshot(noSalt, SERVER, d, T0 + MIN)).skipped, /PLAYER_ID_SALT/);
  assert.equal(noSalt.DB.rows('SELECT COUNT(*) AS n FROM live_match_state')[0].n, 0);
});

test('recorder: finalizing is idempotent (replayed state never double-counts)', async () => {
  const env = makeEnv();
  const db = env.DB;
  const a = matchSequence({ matchId: 'match-a', startMs: T0, minutes: 10, count: 6 });
  await feed(env, a);
  const saved = db.rows('SELECT * FROM live_match_state')[0];
  const last = Date.parse(a.at(-1).sources.gameStateAt);
  await finalizeDue(env, SERVER, last + IDLE_FINALIZE_MS);
  const totals = db.rows('SELECT player_id, kills, matches, cash FROM player_totals ORDER BY player_id');
  db.sqlite.prepare('INSERT INTO live_match_state VALUES (?, ?, ?, ?, ?, ?)').run(saved.server_key, saved.match_key, saved.state, saved.first_snapshot_at, saved.last_snapshot_at, saved.last_active_at);
  await finalizeDue(env, SERVER, last + IDLE_FINALIZE_MS);
  assert.deepEqual(db.rows('SELECT player_id, kills, matches, cash FROM player_totals ORDER BY player_id'), totals);
  assert.equal(db.rows('SELECT COUNT(*) AS n FROM matches')[0].n, 1);
  assert.equal(db.rows('SELECT COUNT(*) AS n FROM live_match_state')[0].n, 0);
});

test('recorder: server restart mid-match (new match id, counters reset) splits into two matches', async () => {
  const env = makeEnv();
  const db = env.DB;
  const first = matchSequence({ matchId: 'pre-restart', startMs: T0, minutes: 12, count: 6 });
  await feed(env, first, { finalizeEach: true });
  const restartAt = T0 + 15 * MIN;
  const second = matchSequence({ matchId: 'post-restart', startMs: restartAt, minutes: 10, count: 6 });
  await feed(env, second, { finalizeEach: true });
  const rows = db.rows('SELECT id, counted, duration_s FROM matches');
  assert.equal(rows.length, 1, 'pre-restart match finalized when the key changed');
  assert.ok(rows[0].id.startsWith('pre-restart-'));
  await finalizeDue(env, SERVER, Date.parse(second.at(-1).sources.gameStateAt) + IDLE_FINALIZE_MS);
  assert.equal(db.rows('SELECT COUNT(*) AS n FROM matches')[0].n, 2);
  assert.equal(db.rows("SELECT matches FROM player_totals WHERE server_key = 'aho-wd' LIMIT 1")[0].matches, 2);
});

test('recorder: empty server writes nothing and an idle match finalizes after 15 minutes', async () => {
  const env = makeEnv();
  const db = env.DB;
  await recordSnapshot(env, SERVER, liveDoc({ matchId: 'e', start: T0, at: T0 + MIN, players: [] }), T0 + MIN);
  assert.equal(db.rows('SELECT COUNT(*) AS n FROM live_match_state')[0].n, 0);

  const docs = matchSequence({ matchId: 'idle', startMs: T0, minutes: 8, count: 5 });
  await feed(env, docs);
  const last = Date.parse(docs.at(-1).sources.gameStateAt);
  for (let m = 1; m <= 5; m++) {
    const at = last + m * MIN;
    await recordSnapshot(env, SERVER, liveDoc({ matchId: 'idle', start: T0, at, players: [] }), at);
  }
  assert.deepEqual(await finalizeDue(env, SERVER, last + 14 * MIN), []);
  const fin = await finalizeDue(env, SERVER, last + 15 * MIN);
  assert.equal(fin.length, 1);
  assert.equal(db.rows('SELECT COUNT(*) AS n FROM live_match_state')[0].n, 0);
});

test('recorder: short warm-up segments are dropped, small matches stored but not counted', async () => {
  const env = makeEnv();
  const db = env.DB;
  const tiny = matchSequence({ matchId: 'tiny', startMs: T0, minutes: 0, count: 6 });
  tiny[0].match.startTime = tiny[0].sources.gameStateAt;
  await feed(env, tiny);
  await finalizeDue(env, SERVER, T0 + 30 * MIN);
  assert.equal(db.rows('SELECT COUNT(*) AS n FROM matches')[0].n, 0);
  const small = matchSequence({ matchId: 'small', startMs: T0 + 40 * MIN, minutes: 10, count: 3 });
  await feed(env, small);
  await finalizeDue(env, SERVER, T0 + 90 * MIN);
  const [m] = db.rows('SELECT counted FROM matches');
  assert.equal(m.counted, 0);
  assert.equal(db.rows('SELECT COUNT(*) AS n FROM player_totals')[0].n, 0);
  assert.equal(db.rows('SELECT COUNT(*) AS n FROM player_matches WHERE counted = 0')[0].n, 3);
});

// ---------------- shared fetch guard + backoff ----------------

function stubFetch(handler) {
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return handler(String(url));
  };
  return calls;
}
const jsonResponse = (obj) => new Response(JSON.stringify(obj), { status: 200, headers: { 'Content-Type': 'application/json' } });

test('shared guard: one Bifrost fetch per window, recorded once; 429 backs off for 10 minutes', async () => {
  const realFetch = globalThis.fetch;
  try {
    const env = { ...makeEnv(), LIVE_CACHE_SECONDS: '60' };
    const db = env.DB;
    const now = Date.now();
    const doc = liveDoc({ matchId: 'g', start: now - 10 * MIN, at: now - 5000, players: [{ i: 1, kills: 2 }, { i: 2 }] });
    const calls = stubFetch(() => jsonResponse(doc));
    await refreshLive(env, SERVER);
    await refreshLive(env, SERVER); // e.g. a visitor right after the cron
    assert.equal(calls.length, 1);
    assert.ok(calls[0].includes('/wd/leaderboards/servers/96fabd0b-b739-498b-906b-16ac0529b0a3/live/json'));
    assert.equal(db.rows('SELECT COUNT(*) AS n FROM live_match_state')[0].n, 1);
    const cache = db.rows('SELECT payload FROM live_cache')[0].payload;
    assert.ok(!/7656119/.test(cache), 'live summary has no player ids');

    // Window passed: next fetch gets a 429 -> backoff for both live and sync, nothing recorded.
    db.sqlite.prepare('UPDATE live_cache SET attempted_at = ?, fetched_at = ?').run(now - 61_000, now - 61_000);
    const calls2 = stubFetch(() => new Response('rate limited', { status: 429, headers: { 'Content-Type': 'text/plain' } }));
    const s = await refreshLive(env, SERVER);
    assert.equal(calls2.length, 1);
    assert.equal(s.stale, true);
    const row = db.rows('SELECT backoff_until FROM live_cache')[0];
    assert.ok(row.backoff_until >= now + 9 * MIN);
    assert.ok(Number(db.rows("SELECT value FROM sync_state WHERE key = 'bifrost_backoff_until'")[0].value) >= now + 9 * MIN);
    db.sqlite.prepare('UPDATE live_cache SET attempted_at = ?, fetched_at = ?').run(now - 120_000, now - 120_000);
    await refreshLive(env, SERVER);
    assert.equal(calls2.length, 1, 'no fetch during backoff');

    // Cloudflare challenge page (HTML 200) also backs off.
    const env3 = makeEnv();
    const calls3 = stubFetch(() => new Response('<html>challenge</html>', { status: 200, headers: { 'Content-Type': 'text/html' } }));
    await refreshLive(env3, SERVER);
    await refreshLive(env3, SERVER);
    assert.equal(calls3.length, 1);
    assert.ok(env3.DB.rows('SELECT backoff_until FROM live_cache')[0].backoff_until > now);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('cron waits briefly for the window instead of skipping a minute', async () => {
  const realFetch = globalThis.fetch;
  try {
    const env = makeEnv();
    const now = Date.now();
    const doc = liveDoc({ matchId: 'w', start: now - 10 * MIN, at: now - 1000, players: [{ i: 1 }] });
    const calls = stubFetch(() => jsonResponse(doc));
    env.DB.sqlite.prepare('INSERT INTO live_cache (server_key, attempted_at, fetched_at) VALUES (?, ?, ?)').run('aho-wd', now - 59_000, now - 59_000);
    const t = Date.now();
    await refreshLive(env, SERVER, 15_000);
    assert.equal(calls.length, 1);
    assert.ok(Date.now() - t >= 1000, 'waited for the 60s window');
    env.DB.sqlite.prepare('UPDATE live_cache SET attempted_at = ?, fetched_at = ?').run(Date.now() - 30_000, Date.now() - 30_000);
    await refreshLive(env, SERVER, 15_000);
    assert.equal(calls.length, 1, 'a fetch 30s ago is reused, not waited for');
  } finally {
    globalThis.fetch = realFetch;
  }
});

// ---------------- API on recorded data ----------------

test('API: summary, leaderboard, profile, matches, POTW and card for aho-wd; hidden players respected', async () => {
  const env = makeEnv();
  const db = env.DB;
  const now = Date.now();
  const s1 = now - 3 * 3600_000;
  const s2 = now - 2 * 3600_000;
  const s3 = now - 1 * 3600_000;
  await feed(env, matchSequence({ matchId: 'api-1', startMs: s1, minutes: 40, count: 12, winner: 'Valkyra' }));
  await finalizeDue(env, SERVER, s1 + 120 * MIN);
  await feed(env, matchSequence({ matchId: 'api-2', startMs: s2, minutes: 40, count: 12, winner: 'Lonestar' }));
  await finalizeDue(env, SERVER, s2 + 120 * MIN);
  await feed(env, matchSequence({ matchId: 'api-3', startMs: s3, minutes: 40, count: 12, winner: 'Valkyra' }));
  await finalizeDue(env, SERVER, s3 + 120 * MIN);

  const sum = await serverSummary(env, 'aho-wd');
  assert.equal(sum.history, true);
  assert.equal(sum.historySource, 'live');
  assert.equal(sum.matches, 3);
  assert.equal(sum.players, 12);
  assert.ok(sum.recordingSince);
  const val = sum.factionStats.find((f) => f.name === 'Valkyra');
  assert.deepEqual([val.matches, val.wins, val.colour], [3, 2, '#FA503E']);

  for (const stat of ['kills', 'deaths', 'kd', 'cash', 'matches', 'time']) {
    const lb = await leaderboard(env, params({ server: 'aho-wd', stat, period: 'all' }));
    assert.ok(lb.rows.length > 0, stat);
    assert.ok('cash' in lb.rows[0]);
  }
  const week = await leaderboard(env, params({ server: 'aho-wd', stat: 'cash', period: 'week' }));
  assert.ok(week.rows[0].value >= week.rows.at(-1).value);
  await assert.rejects(leaderboard(env, params({ server: 'aho-wd', stat: 'combat' })), (e) => e.status === 400 && /kills, deaths, kd, cash, matches, time/.test(e.message));

  const list = await listMatches(env, params({ server: 'aho-wd' }));
  assert.equal(list.total, 3);
  assert.equal(list.rows[0].factionScores.length, 3);
  assert.equal(list.rows[0].winner, 'Valkyra');
  const det = await matchDetail(env, list.rows[0].id, params({ server: 'aho-wd' }));
  assert.equal(det.rows.length, 12);
  assert.deepEqual(Object.keys(det.rows[0]).sort(), ['cash', 'deaths', 'hidden', 'kills', 'name', 'playerId', 'side', 'timeSeconds']);

  const top = det.rows[0];
  const prof = await playerProfile(env, top.playerId, params({ server: 'aho-wd' }));
  assert.equal(prof.historySource, 'live');
  assert.equal(prof.totals.matches, 3);
  assert.ok(prof.totals.cash > 0);
  assert.equal(prof.wins + prof.losses, 3);
  assert.equal(prof.recentMatches.length, 3);
  assert.equal(typeof prof.recentMatches[0].won, 'boolean');

  const potw = await playerOfTheWeek(env, params({ server: 'aho-wd' }));
  assert.deepEqual(potw.categories.map((c) => c.label), ['Top Kills', 'Best K/D', 'Top Earner']);
  assert.ok(potw.categories[0].winner && potw.categories[2].winner);

  const card = await playerCard(env, params({ server: 'aho-wd' }), top.playerId);
  assert.equal(card.status, 200);
  assert.match(await card.text(), /CASH/);

  // Hide the top player.
  db.sqlite.prepare("INSERT INTO hidden_players (player_id, server_key) VALUES (?, '*')").run(top.playerId);
  db.sqlite.exec('DELETE FROM kv_cache');
  const lb2 = await leaderboard(env, params({ server: 'aho-wd', stat: 'kills', period: 'all' }));
  assert.ok(!lb2.rows.some((r) => r.playerId === top.playerId));
  const det2 = await matchDetail(env, list.rows[0].id, params({ server: 'aho-wd' }));
  const h = det2.rows.find((r) => r.hidden);
  assert.deepEqual([h.playerId, h.name], [null, 'Hidden player']);
  await assert.rejects(playerProfile(env, top.playerId, params({ server: 'aho-wd' })), (e) => e.status === 404 && e.message === 'This profile is hidden');
  assert.equal((await playerCard(env, params({ server: 'aho-wd' }), top.playerId)).status, 404);
});

// Pure match-recording logic for servers whose only data is Bifrost's live feed (Wardogs):
// each snapshot is folded into one state object per match, which is turned into match and
// player rows once the match ends. No I/O here, so it can be unit-tested with plain Node.
import { num, parseMap, str } from './livedoc.js';

// Time credited per snapshot is the gap since the previous one, capped so outages and backoff
// windows don't credit time nobody observed; the first snapshot of a match counts as one interval.
export const NOMINAL_GAP_S = 60;
export const MAX_GAP_S = 120;
// Feeds whose game state is older than this are an offline server, not a running match.
export const FEED_MAX_AGE_MS = 10 * 60 * 1000;
// Players kept per match state (churn guard; one row stays well under D1's row size limit).
const MAX_TRACKED_PLAYERS = 600;
const MATCH_ID_RE = /[^A-Za-z0-9_.:-]/g;

function iso(v) {
  const t = Date.parse(v);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

function int(v) {
  const n = num(v);
  return n == null ? 0 : Math.max(0, Math.round(n));
}

/**
 * Whitelists what the recorder needs from a live document. Raw player ids are kept only so the
 * caller can hash them; they never leave the recorder. Returns null when there is nothing to record.
 */
export function readSnapshot(doc, nowMs = Date.now()) {
  if (!doc || typeof doc !== 'object') return null;
  const match = doc.match && typeof doc.match === 'object' ? doc.match : {};
  const at = Date.parse(doc.sources?.gameStateAt || match.lastUpdated || doc.generatedAt || '');
  if (!Number.isFinite(at) || nowMs - at > FEED_MAX_AGE_MS) return null;
  const start = iso(match.startTime);
  const mapId = str(match.mapId, 100);
  const key = str(match.matchId, 60) || (mapId && start ? `${mapId}|${start}` : null);
  if (!key || match.isTransitioning === true) return null;

  let list = Array.isArray(doc.players) ? doc.players : null;
  if (!list && Array.isArray(doc.factions)) list = doc.factions.flatMap((f) => (Array.isArray(f?.players) ? f.players : []));
  const seen = new Set();
  const players = [];
  for (const p of list || []) {
    const id = p && p.id != null ? String(p.id).slice(0, 64) : '';
    if (!id || seen.has(id)) continue;
    seen.add(id);
    players.push({
      rawId: id,
      name: str(p.name, 64),
      faction: str(p.faction, 40),
      kills: int(p.kills),
      deaths: int(p.deaths),
      cash: int(p.cash),
    });
  }
  const factions = (Array.isArray(doc.factions) ? doc.factions : [])
    .slice(0, 6)
    .map((f) => ({
      name: str(f?.name, 40),
      score: num(f?.score),
      colour: /^#[0-9a-f]{3,8}$/i.test(f?.colour || '') ? f.colour : null,
    }))
    .filter((f) => f.name);
  const map = parseMap(match) || {};
  return {
    key,
    at,
    start,
    mapId,
    mapName: map.name || null,
    mapPretty: map.pretty || null,
    mode: map.mode || null,
    environment: map.environment || null,
    factions,
    players,
  };
}

export function newState(snap) {
  return {
    v: 1,
    key: snap.key,
    mapId: snap.mapId,
    mapName: snap.mapName,
    mapPretty: snap.mapPretty,
    mode: snap.mode,
    environment: snap.environment,
    start: snap.start,
    first: snap.at,
    last: 0,
    active: 0,
    n: 0,
    peak: 0,
    factions: [],
    p: {},
  };
}

/**
 * Folds one snapshot into `state` (mutated and returned). `players` are the snapshot's players with
 * `id` already hashed. Kills/deaths/cash in the feed are cumulative for the match; if a player's
 * kills or deaths go down (reconnect or server restart that kept the match id) the previous values
 * are banked so nothing is lost. Cash is a running maximum per segment in case it is a wallet.
 * Returns false when the snapshot is not newer than the last one folded.
 */
export function foldSnapshot(state, snap, players) {
  if (state.last && snap.at <= state.last) return false;
  const gap = state.last ? Math.min(MAX_GAP_S, Math.max(0, (snap.at - state.last) / 1000)) : NOMINAL_GAP_S;
  const prevLast = state.last;
  for (const sp of players) {
    let r = state.p[sp.id];
    if (!r) {
      if (Object.keys(state.p).length >= MAX_TRACKED_PLAYERS) continue;
      r = state.p[sp.id] = { n: null, f: null, ft: {}, k: 0, d: 0, c: 0, bk: 0, bd: 0, bc: 0, t: 0, s: 0, fs: snap.at, ls: 0 };
    }
    if (sp.kills < r.k || sp.deaths < r.d) {
      r.bk += r.k;
      r.bd += r.d;
      r.bc += r.c;
      r.k = r.d = r.c = 0;
    }
    r.k = sp.kills;
    r.d = sp.deaths;
    r.c = Math.max(r.c, sp.cash);
    if (sp.name) r.n = sp.name;
    // Someone who just (re)joined was there for about half the interval.
    const dt = prevLast && r.ls === prevLast ? gap : gap / 2;
    r.t += dt;
    if (sp.faction) {
      r.f = sp.faction;
      r.ft[sp.faction] = (r.ft[sp.faction] || 0) + dt;
    }
    r.s++;
    r.ls = snap.at;
  }
  if (snap.factions.length) state.factions = snap.factions;
  if (snap.mapPretty) state.mapPretty = snap.mapPretty;
  if (snap.mode) state.mode = snap.mode;
  if (!state.start && snap.start) state.start = snap.start;
  if (players.length) state.active = snap.at;
  state.peak = Math.max(state.peak, players.length);
  state.last = snap.at;
  state.n++;
  return true;
}

/** Faction with the strictly highest score, or null (no scores, all zero, or a tie). */
export function winnerOf(factions) {
  let best = null;
  let tie = false;
  for (const f of factions || []) {
    if (f.score == null) continue;
    if (!best || f.score > best.score) {
      best = f;
      tie = false;
    } else if (f.score === best.score) {
      tie = true;
    }
  }
  return best && !tie && best.score > 0 ? best.name : null;
}

function mainFaction(r) {
  let side = r.f;
  let most = -1;
  for (const [f, t] of Object.entries(r.ft || {})) {
    if (t > most) {
      most = t;
      side = f;
    }
  }
  return side;
}

/** Stable, URL-safe match id for one recorded match segment. */
export function matchIdFor(state) {
  const base = String(state.key).replace(MATCH_ID_RE, '_').slice(0, 60);
  return `${base}-${Math.floor(state.first / 1000).toString(36)}`;
}

/**
 * Turns a finished match state into rows for D1, or null when it is too short to keep.
 * opts: { serverKey, minDurationS, minPlayers, keepMinS }.
 */
export function finalRows(state, { serverKey, minDurationS = 300, minPlayers = 4, keepMinS = 120 }) {
  const endMs = state.active || state.last || state.first;
  const startMs = Date.parse(state.start);
  // Bifrost's start time is the real match start; fall back to the first snapshot.
  const begin = Number.isFinite(startMs) && startMs <= endMs ? startMs : state.first;
  const durationS = Math.max(0, Math.round((endMs - begin) / 1000));
  const players = Object.entries(state.p)
    .map(([id, r]) => ({
      id,
      name: r.n,
      side: mainFaction(r),
      kills: r.bk + r.k,
      deaths: r.bd + r.d,
      cash: r.bc + r.c,
      time: Math.round(r.t),
    }))
    .filter((p) => p.time > 0)
    .sort((a, b) => b.kills - a.kills || b.cash - a.cash);
  if (!players.length || durationS < keepMinS) return null;
  const mapId = state.mapId || null;
  const factions = (state.factions || []).map((f) => ({ name: f.name, score: f.score, colour: f.colour }));
  const counted = durationS >= minDurationS && players.length >= minPlayers;
  return {
    counted,
    players,
    match: {
      id: matchIdFor(state),
      serverKey,
      mapId,
      mapBase: mapId ? mapId.split('_')[0] : null,
      mapPretty: state.mapPretty || state.mapName || mapId,
      mapBasePretty: state.mapName || null,
      gameMode: state.mode || null,
      environment: state.environment || null,
      start: new Date(begin).toISOString(),
      end: new Date(endMs).toISOString(),
      durationS,
      playerCount: players.length,
      factionScores: JSON.stringify(factions),
      winner: winnerOf(factions),
    },
  };
}

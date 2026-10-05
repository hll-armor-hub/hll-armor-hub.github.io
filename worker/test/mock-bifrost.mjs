// Local stand-in for bifroststats.com so `wrangler dev` never contacts Bifrost.
// Use with BIFROST_BASE_URL=http://127.0.0.1:8799 in .dev.vars. node test/mock-bifrost.mjs [port]
//   GET /<game>/leaderboards/servers/<id>/live/json  -> synthetic live doc stamped "now" (Wardogs: a match in progress)
//   GET /__status?code=429                          -> make live feeds answer with that status (0 = normal)
//   GET /__log                                      -> request log [{ path, at }]
import { createServer } from 'node:http';
import { liveDoc } from './synthetic.mjs';

const port = Number(process.argv[2]) || 8799;
const log = [];
let forceStatus = 0;
const matchStart = Date.now() - 20 * 60_000;

function wdDoc() {
  const minutes = Math.floor((Date.now() - matchStart) / 60_000);
  const players = Array.from({ length: 10 }, (_, j) => ({
    i: 500 + j,
    name: `Mock Live ${j + 1}`,
    faction: ['Lonestar', 'Valkyra', 'Manticore'][j % 3],
    kills: minutes + j,
    deaths: Math.floor(minutes / 2),
    cash: minutes * 150 + j * 10,
  }));
  return liveDoc({ matchId: 'mock-live-match', start: matchStart, at: Date.now() - 2000, players, scores: { Lonestar: minutes, Valkyra: minutes * 2, Manticore: 3 } });
}

function hllDoc() {
  const now = new Date().toISOString();
  return {
    generatedAt: now,
    server: { name: 'Mock HLL', maxPlayers: 100 },
    match: { mapId: 'carentan_warfare', mapName: 'Carentan (Day)', gamemode: 'warfare', startTime: now, elapsedSeconds: 60, timeRemainingSeconds: 5000, lastUpdated: now },
    playerCount: 0,
    teams: { allies: { faction: 'US', score: 2, playerCount: 0 }, axis: { faction: 'GER', score: 3, playerCount: 0 } },
    players: [],
    sources: { gameStateAt: now },
  };
}

createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  if (url.pathname === '/__log') return res.end(JSON.stringify(log));
  if (url.pathname === '/__status') {
    forceStatus = Number(url.searchParams.get('code')) || 0;
    return res.end(JSON.stringify({ forceStatus }));
  }
  log.push({ path: url.pathname, at: Date.now() });
  const m = /^\/(\w+)\/leaderboards\/servers\/[\w-]+\/live\/json$/.exec(url.pathname);
  if (m && forceStatus) {
    res.writeHead(forceStatus, { 'Content-Type': 'text/plain' });
    return res.end('mock status');
  }
  if (m) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(m[1] === 'wd' ? wdDoc() : hllDoc()));
  }
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ failed: true }));
}).listen(port, '127.0.0.1', () => console.log(`mock bifrost on http://127.0.0.1:${port}`));

// Seeds a LOCAL Worker (wrangler dev with ALLOW_TEST_SNAPSHOTS=1) with synthetic Wardogs matches by
// posting live documents to /v1/admin/live-snapshot, i.e. through the real recorder and finalizer.
// node test/seed-local.mjs http://127.0.0.1:8790 local-dev-token
import { matchSequence } from './synthetic.mjs';

const [base = 'http://127.0.0.1:8790', token = 'local-dev-token'] = process.argv.slice(2);
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(base)) throw new Error('seed only targets a local Worker');

const HOUR = 3600_000;
const now = Date.now();
const matches = [
  { matchId: 'seed-1', startMs: now - 50 * HOUR, minutes: 45, count: 14, winner: 'Valkyra', mapId: 'zestafona_detroit_koth_01_daylateclear_houses', mapName: 'ZESTAFONA (Day Late Clear, KOTH, Houses Circle)' },
  { matchId: 'seed-2', startMs: now - 30 * HOUR, minutes: 40, count: 16, winner: 'Lonestar', mapId: 'tbilisi_detroit_koth_02_night', mapName: 'TBILISI (Night, KOTH)' },
  { matchId: 'seed-3', startMs: now - 8 * HOUR, minutes: 50, count: 15, winner: 'Manticore', mapId: 'zestafona_detroit_koth_01_daylateclear_houses', mapName: 'ZESTAFONA (Day Late Clear, KOTH, Houses Circle)' },
  { matchId: 'seed-4', startMs: now - 3 * HOUR, minutes: 35, count: 12, winner: 'Valkyra', mapId: 'kutaisi_detroit_koth_01_day', mapName: 'KUTAISI (Day, KOTH)' },
];

async function post(doc, finalize) {
  const res = await fetch(`${base}/v1/admin/live-snapshot?server=aho-wd${finalize ? '&finalize=1' : ''}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(doc),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(body)}`);
  return body;
}

for (const m of matches) {
  const docs = matchSequence({ ...m, firstId: 1 });
  for (let i = 0; i < docs.length; i++) {
    const r = await post(docs[i], i === docs.length - 1);
    if (r.finalized?.length) console.log(m.matchId, JSON.stringify(r.finalized));
  }
}
console.log('seeded', matches.length, 'matches');

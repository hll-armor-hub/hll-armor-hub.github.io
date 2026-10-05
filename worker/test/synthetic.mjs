// Synthetic Bifrost Wardogs live documents shaped like worker/tmp/live-wd.json (including the
// private fields the recorder must ignore: ping, VIP, staff role).
export const FACTIONS = [
  { name: 'Lonestar', colour: '#4CB1EF' },
  { name: 'Valkyra', colour: '#FA503E' },
  { name: 'Manticore', colour: '#1DD65C' },
];

export const steamId = (i) => String(76561198000000000n + BigInt(i));

/**
 * players: [{ i, name, faction, kills, deaths, cash }] (i -> fake Steam64 id).
 * scores: { Lonestar: n, ... }. at: ISO or ms of the game state.
 */
export function liveDoc({ matchId, mapId = 'zestafona_detroit_koth_01_daylateclear_houses', mapName = 'ZESTAFONA (Day Late Clear, KOTH, Houses Circle)', start, at, players = [], scores = {}, transitioning = false }) {
  const atIso = new Date(at).toISOString();
  const ps = players.map((p) => {
    const f = FACTIONS.find((x) => x.name === p.faction) || FACTIONS[0];
    return {
      id: steamId(p.i),
      name: p.name ?? `Player ${p.i}`,
      faction: f.name,
      colorHex: f.colour,
      kills: p.kills ?? 0,
      deaths: p.deaths ?? 0,
      cash: p.cash ?? 0,
      ping: 40 + (p.i % 80),
      isVip: p.i % 3 === 0,
      vipExpiresAt: p.i % 3 === 0 ? '2031-09-27T17:40:00.030Z' : null,
      isGuildStaff: p.i % 5 === 0,
      guildRole: p.i % 5 === 0 ? 'guild-admin' : null,
      isTrackedMember: false,
    };
  });
  return {
    generatedAt: atIso,
    refreshSeconds: 30,
    server: { shortId: null, serverId: '96fabd0b-b739-498b-906b-16ac0529b0a3', name: 'AFTER HOURS OPERATORS | US EAST', gameType: 'WD' },
    match: {
      matchId,
      mapId,
      mapName,
      gamemode: 'Detroit_KOTH_01',
      isTransitioning: transitioning,
      startTime: new Date(start).toISOString(),
      elapsedSeconds: Math.round((Date.parse(atIso) - Date.parse(new Date(start).toISOString())) / 1000),
      timeRemainingSeconds: null,
      lastUpdated: atIso,
    },
    playerCount: ps.length,
    teams: null,
    factions: FACTIONS.map((f) => ({
      name: f.name,
      colour: f.colour,
      score: scores[f.name] ?? 0,
      playerCount: ps.filter((p) => p.faction === f.name).length,
      players: ps.filter((p) => p.faction === f.name),
    })),
    players: ps,
    sources: { gameStateAt: atIso, playersAt: atIso },
  };
}

/**
 * A whole match as one snapshot per minute: `count` players spread over the 3 factions, joining
 * and leaving at different times, kills/deaths/cash growing with time. Returns live documents.
 */
export function matchSequence({ matchId, startMs, minutes = 30, count = 12, firstId = 1, mapId, mapName, winner = 'Valkyra' }) {
  const docs = [];
  for (let m = 0; m <= minutes; m++) {
    const at = startMs + 60_000 * (m + 1);
    const players = [];
    for (let j = 0; j < count; j++) {
      const joinAt = j % 4 === 3 ? Math.floor(minutes / 3) : 0;
      const leaveAt = j % 5 === 4 ? Math.floor((minutes * 2) / 3) : minutes + 1;
      if (m < joinAt || m >= leaveAt) continue;
      const played = m - joinAt + 1;
      players.push({
        i: firstId + j,
        name: `Synthetic ${String(firstId + j).padStart(3, '0')}`,
        faction: FACTIONS[j % 3].name,
        kills: Math.floor((played * (j + 2)) / 4),
        deaths: Math.floor((played * (count - j + 1)) / 8),
        cash: played * (100 + 25 * j),
      });
    }
    const scores = {};
    FACTIONS.forEach((f, idx) => {
      scores[f.name] = Math.floor(m * (f.name === winner ? 3 : 1 + idx * 0.5));
    });
    docs.push(liveDoc({ matchId, mapId, mapName, start: startMs, at, players, scores }));
  }
  return docs;
}

// Field helpers for Bifrost live feed documents, shared by /v1/live and the match recorder.

export function num(v) {
  const n = Number(v);
  return v != null && Number.isFinite(n) ? n : null;
}

export function str(v, max = 120) {
  return typeof v === 'string' && v ? v.slice(0, max) : null;
}

function titleCase(s) {
  return s.toLowerCase().replace(/(^|[\s-])\p{L}/gu, (c) => c.toUpperCase());
}

export function prettyMode(mode) {
  const s = str(mode, 60);
  if (!s) return null;
  if (/koth/i.test(s)) return 'KOTH';
  return titleCase(s.replace(/_/g, ' ').replace(/\s*\d+$/, '').trim());
}

// "Carentan (Day)" -> Carentan / Day; "ZESTAFONA (Day Late Clear, KOTH, Houses Circle)" -> Zestafona / Day Late Clear
export function parseMap(match) {
  const raw = str(match.mapName);
  if (!raw && !match.mapId) return null;
  const m = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(raw || '');
  let name = (m ? m[1] : raw || match.mapId || '').trim();
  if (name && name === name.toUpperCase()) name = titleCase(name);
  const parts = m ? m[2].split(',').map((x) => x.trim()).filter(Boolean) : [];
  const environment = parts[0] || null;
  return {
    id: str(match.mapId),
    name,
    pretty: parts.length ? `${name} (${parts.join(', ')})` : name,
    mode: prettyMode(match.gamemode),
    environment,
  };
}

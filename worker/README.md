# AHO Stats Worker

A Cloudflare Worker that copies After Hours Operators match stats from Bifrost into a
Cloudflare D1 database every 10 minutes and serves them as a small JSON API for
hll-armor-hub.com.

## One-time setup (Windows PowerShell)

1. Create a free account at <https://dash.cloudflare.com/sign-up>.
2. Open PowerShell in the repo and install dependencies:

   ```powershell
   cd worker
   npm install
   ```

3. Log in to Cloudflare (opens your browser):

   ```powershell
   npx wrangler login
   ```

4. Create the database:

   ```powershell
   npx wrangler d1 create aho-stats
   ```

   It prints a `database_id` like `xxxxxxxx-xxxx-...`. Open `wrangler.toml` and replace
   `REPLACE_WITH_D1_ID` with that value.

5. Create the tables:

   ```powershell
   npm run db:init:remote
   ```

6. Choose an admin password (any long random string) and store it as a secret. Paste it when prompted:

   ```powershell
   npx wrangler secret put ADMIN_TOKEN
   ```

7. Deploy:

   ```powershell
   npm run deploy
   ```

   Note the URL it prints, e.g. `https://aho-stats.<your-subdomain>.workers.dev`.

## First sync and checking progress

The cron job runs every 10 minutes on its own. To start one right away:

```powershell
$url = "https://aho-stats.<your-subdomain>.workers.dev"
Invoke-RestMethod -Method Post -Uri "$url/v1/admin/sync" -Headers @{ Authorization = "Bearer YOUR_ADMIN_TOKEN" }
```

(or with curl: `curl.exe -X POST -H "Authorization: Bearer YOUR_ADMIN_TOKEN" "$url/v1/admin/sync"`)

Check progress:

```powershell
Invoke-RestMethod "$url/v1/status" | ConvertTo-Json -Depth 5
```

`matchesStored` should approach `total` within an hour or so, and `matchesProcessed`
catches up gradually. Each run syncs **one** server (rotating through every server whose
`history` isn't `false` in `SERVERS`) and processes up to `MATCHES_PER_RUN` matches (newest
first), so backfill takes a while. Add `?server=aho-hll` to the admin sync URL to target one server.
Once a server's backfill is done, each run also re-reads **one** older list page (until the last
page) to fill in faction names for matches stored before migration 0004; it uses the same fetch
budget and stops for good when it reaches the end (`faction_page:<server>` = `done` in `sync_state`).

## Live server status (`/v1/live`)

`/v1/live` (optionally `?server=aho-wd`) returns a small, privacy-safe summary of every
server's Bifrost live feed: players, map, mode, score, time left, and a `seeding` flag
(`players < SEEDING_BELOW`). It contains no player names or IDs.

Bifrost blocks clients that poll a live feed more often than every ~30s (a 4-hour block that
would also break the match sync), so:

- The Worker fetches each live feed at most once per `LIVE_CACHE_SECONDS` (default 60,
  never below 45). The last snapshot and fetch time live in the D1 `live_cache` table, and a
  single atomic D1 update decides which request may fetch, so concurrent visitors and isolates
  can't stampede Bifrost. The once-a-minute recorder cron (below) goes through the same claim,
  so a visitor and the cron never both fetch in the same window.
- On a 403/429/503 or an HTML challenge page, both live fetching and the match sync back off
  for 10 minutes; `/v1/live` keeps serving the last snapshot with `stale: true`.
- Don't curl Bifrost's `/live/json` URLs by hand more than once every 45s per server.

## Wardogs history (recorded from the live feed)

Wardogs has no CRCON match records, so servers marked `"historySource":"live"` in `SERVERS`
(currently `aho-wd`) get their history from the live feed instead:

- A second cron, `* * * * *`, refreshes the live feed through the shared `live_cache` claim (at most
  one Bifrost fetch per `LIVE_CACHE_SECONDS`, whoever wins the claim) and folds each new snapshot into
  one `live_match_state` row per match: per-player kills, deaths, cash and estimated time on each faction.
  A visitor's `/v1/live` request that wins the claim folds the snapshot too, so nothing is fetched twice.
- When the match id changes, or the server has been idle for 15 minutes, the match is written to
  `matches` / `player_matches` / `player_totals` and the state row is deleted. Matches shorter than
  `LIVE_MIN_MATCH_SECONDS` (300) or with fewer than `LIVE_MIN_PLAYERS` (4) are kept but not counted
  in totals; matches under 2 minutes are dropped.
- Player ids are `wd-` plus an HMAC-SHA256 of the Steam id keyed with the `PLAYER_ID_SALT` secret.
  Raw Steam ids, VIP, staff role, ping and IPs are never stored. **Set the salt once and never change
  it** (changing it splits everyone's history):

  ```powershell
  npx wrangler secret put PLAYER_ID_SALT   # paste a long random string (at least 16 characters)
  ```

- Without the salt or migration 0005, the recorder logs `record [{"skipped":"..."}]` once a minute,
  makes no Bifrost request, and the Wardogs endpoints return the `history: false` shape.
- Numbers are approximate: time is estimated from one-minute snapshots, cash is the highest value
  seen, and a match that was already running when recording started only counts from that point.

## Upgrading an existing database

`schema.sql` always contains the full schema; databases created before a feature was added need
each migration once, in order (all are additive and safe to re-run):

```powershell
npx wrangler d1 execute aho-stats --remote --file=migrations/0002_live_cache.sql
npx wrangler d1 execute aho-stats --remote --file=migrations/0003_potw_privacy_cache.sql
npx wrangler d1 execute aho-stats --remote --file=migrations/0004_match_factions.sql
npx wrangler d1 execute aho-stats --remote --file=migrations/0005_live_history.sql
```

`0004` adds columns, so running it a second time fails with `duplicate column name: allied_faction`;
that error is harmless. Apply it **before** deploying code that uses it (the sync and match
endpoints read and write `allied_faction` / `axis_faction`).

If `--remote --file=...` fails with `Authentication error [code: 10000]` (the file import API can reject
OAuth logins), run the statements one at a time with `--command`. For `0005_live_history.sql`:

```powershell
npx wrangler d1 execute aho-stats --remote --command "CREATE TABLE IF NOT EXISTS live_match_state (server_key TEXT NOT NULL, match_key TEXT NOT NULL, state TEXT NOT NULL, first_snapshot_at INTEGER NOT NULL DEFAULT 0, last_snapshot_at INTEGER NOT NULL DEFAULT 0, last_active_at INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (server_key, match_key)) WITHOUT ROWID"
npx wrangler d1 execute aho-stats --remote --command "ALTER TABLE matches ADD COLUMN faction_scores TEXT"
npx wrangler d1 execute aho-stats --remote --command "ALTER TABLE matches ADD COLUMN winner TEXT"
npx wrangler d1 execute aho-stats --remote --command "ALTER TABLE player_matches ADD COLUMN cash INTEGER NOT NULL DEFAULT 0"
npx wrangler d1 execute aho-stats --remote --command "ALTER TABLE player_totals ADD COLUMN cash INTEGER NOT NULL DEFAULT 0"
```

Each `ALTER` that already ran fails with `duplicate column name`, which is harmless; run all five.
The Worker notices the new tables within 5 minutes without a redeploy.

## Player of the Week (`/v1/potw`)

`/v1/potw?server=aho-hllv` returns the last 7 days' winners (plus two runners-up) for Top Kills,
Combat, Offense, Defense, Support, Best K/D and Best Kills/Min. K/D and KPM need at least 3 matches
and 1 hour played. The result is computed by one query and stored in the D1 `kv_cache` table; it is
recomputed at most once per `POTW_CACHE_SECONDS` (default and minimum 3600) and only when someone
asks for it, so idle servers cost nothing.

## Hiding a player (privacy opt-out)

A hidden player is left out of the leaderboard, search, Player of the Week and other players'
nemesis/victim lists; their profile returns `404 {"error":"This profile is hidden"}`, their
card and share link show a generic "hidden" page, and match scoreboards show them as
`"Hidden player"` with `playerId: null` (stats kept, no profile link; their names are dropped from
everyone's most-killed / killed-by lists). Hide someone on every server:

```powershell
$url = "https://aho-stats.<your-subdomain>.workers.dev"
curl.exe -X POST "$url/v1/admin/hide" -H "Authorization: Bearer YOUR_ADMIN_TOKEN" -H "Content-Type: application/json" -d '{\"playerId\":\"PLAYER_ID_HERE\"}'
```

Add `\"server\":\"aho-hll\"` to the JSON to hide them on one server only. Undo with the same body
sent to `/v1/admin/unhide` (no `server` = remove every hide for that player). List everyone hidden:
`curl.exe -H "Authorization: Bearer YOUR_ADMIN_TOKEN" "$url/v1/admin/hidden"`.

The player ID is the last part of their profile URL on the site (`#/community/player/<id>`).
Cached responses can take up to 10 minutes to update everywhere (up to 1 hour for a finished
match's scoreboard, which is cached longer). Bifrost's own site is not affected.

## Discord member counts (`/v1/discord`)

Returns `{name, memberCount, onlineCount, invite, updatedAt, stale}` from Discord's public invite
API for `discord.gg/AHO`. Discord is called at most once per `DISCORD_CACHE_SECONDS` (default and
minimum 600) across all isolates, using the same D1 claim as the live feeds. If Discord fails, the
last counts are served with `stale: true`.

## Shareable player cards

- `/v1/card/<playerId>.svg?server=aho-hllv` is a 1200x630 SVG stat card (cached 10 minutes), handy
  for embedding with `<img>`.
- `/p/<playerId>?server=aho-hllv` is the link to share in Discord: it has Open Graph/Twitter tags
  (`<name> · AHO stats` plus key stats) and immediately redirects visitors to the player's page on
  hll-armor-hub.com. Discord doesn't render SVG previews, so the preview image is the site logo.

## Optional: weekly Player of the Week post in Discord

Off by default. To turn it on, create a **new** webhook in Discord (channel settings >
Integrations > Webhooks > New Webhook > Copy Webhook URL). Do not reuse any webhook URL that has
been pasted in a chat; delete those in Discord and make a fresh one. Store it as a secret, never in a file:

```powershell
npx wrangler secret put DISCORD_POTW_WEBHOOK
```

The cron then posts one embed with every server's winners once a week, on `POTW_POST_DAY`
(0 = Sunday, default 1 = Monday) from `POTW_POST_HOUR_UTC` (default 1, i.e. Sunday evening in the
US). The last post time is stored in `sync_state` (`potw_posted_at`), so it never posts twice in a
week. That cron run skips its match sync to stay within free plan limits. Turn it off with
`npx wrangler secret delete DISCORD_POTW_WEBHOOK`.

## Optional: custom domain

If the DNS for hll-armor-hub.com is managed by Cloudflare, open the Cloudflare dashboard,
go to **Workers & Pages > aho-stats > Settings > Domains & Routes > Add > Custom domain**,
and enter `stats.hll-armor-hub.com`. If the DNS is somewhere else (e.g. only GitHub Pages),
skip this and use the workers.dev URL. Edge caching (Cache API) only takes effect on a
custom domain; on workers.dev, responses are still cached by browsers for 60 seconds.

## Free plan notes

The free Workers plan allows only 10 ms CPU time and 50 subrequests/D1 queries per run.
Reading one match file takes a few ms, so 25 matches per run may exceed that. If
`npx wrangler tail` shows "Exceeded CPU" or "Too many subrequests" errors, lower
`MATCHES_PER_RUN` in `wrangler.toml` (e.g. to `3`) and run `npm run deploy` again. Backfill
then takes longer. The $5/month Workers Paid plan removes this constraint.

## API

Public endpoints are `GET` and return JSON unless noted. `server` defaults to the first configured server (`aho-hllv`).

- `/v1/status`
- `/v1/live?server=aho-hllv` (`server` optional; all servers by default)
- `/v1/servers/aho-hllv/summary`
- `/v1/leaderboard?server=aho-hllv&period=week|month|all&stat=kills|combat|offense|defense|support|kd|kpm|time|teamkills|vehicles&limit=25`
- `/v1/players/search?q=name&server=aho-hllv`
- `/v1/players/<playerId>?server=aho-hllv`
- `/v1/matches?server=aho-hllv&page=1` (25 per page, newest first; cached 60 s)
- `/v1/matches/<matchId>?server=aho-hllv` (match + scoreboard; cached 1 hour once imported, else 60 s)
- `/v1/potw?server=aho-hllv`
- `/v1/discord`
- `/v1/card/<playerId>.svg?server=aho-hllv` (SVG image)
- `/p/<playerId>?server=aho-hllv` (HTML share page that redirects to the site)

The site gets **all** match data from these two endpoints; the browser never requests Bifrost JSON
(Bifrost's Cloudflare rules block visitor IPs that load match files quickly). Each match row is:

```json
{ "id": "…", "mapId": "wdevb_warfare_day", "mapBase": "wdevb", "mapPretty": "Quảng Ngãi (Day) Warfare",
  "mapBasePretty": "Quảng Ngãi", "gameMode": "warfare", "attackers": null, "environment": "day",
  "imageName": "wdevb-day.webp", "start": "…Z", "end": "…Z", "durationS": 1752, "alliedScore": 0,
  "axisScore": 5, "alliedFaction": "us", "axisFaction": "nva", "playerCount": 147,
  "processed": true, "status": "done" }
```

`status` is `pending` (scoreboard not imported yet), `done` or `unavailable` (Bifrost had no match
file); `alliedFaction`/`axisFaction` are `null` for matches stored before migration 0004 until the
sync re-reads their list page. The detail endpoint returns the same fields plus `server` and
`rows` (empty unless `processed`), one per player with time played:

```json
{ "playerId": "…", "name": "…", "hidden": false, "platform": "steam", "side": "allies", "level": 26,
  "kills": 24, "deaths": 5, "teamkills": 0, "killsStreak": 17, "timeSeconds": 1659, "combat": 207,
  "offense": 240, "defense": 200, "support": 5, "vehiclesDestroyed": 0,
  "topWeapons": [{ "weapon": "M14", "kills": 24 }], "mostKilled": [{ "name": "…", "count": 2 }],
  "deathBy": [{ "name": "…", "count": 1 }] }
```

Top weapons are the top 5 per player-match, most killed / killed by the top 3 (as stored at sync
time). An unknown match id returns `404 {"error":"match not found"}`.

For a server without match history (`"history": false`, or a live-recorded server before migration
0005), the list endpoints return empty results with `history: false` (e.g. `{"history":false,"rows":[]}`)
and player profiles return `404 {"error":"no match history for this server","history":false}`.

Live-recorded servers (Wardogs) add `"historySource": "live"` to their responses and differ like this:

- Summary: adds `recordingSince`, `cash` and `factionStats: [{name, colour, matches, wins}]`.
- Leaderboard `stat` is one of `kills|deaths|kd|cash|matches|time` (anything else is `400`); rows include `cash`.
- POTW categories are Top Kills, Best K/D and Top Earner (cash).
- Match rows add `factionScores: [{name, score, colour}]` and `winner` (faction name, `null` on a tie);
  `alliedScore`/`axisScore` are unused. Scoreboard rows are
  `{playerId, name, hidden, side, kills, deaths, cash, timeSeconds}`, where `side` is the faction played longest.
- Profiles have totals with `cash`, `wins`, `losses`, and recent matches with `side`, `won`, `cash`, `timeSeconds`.
- Cards show cash in place of the HLL-only stat.

Admin endpoints (all need `Authorization: Bearer <ADMIN_TOKEN>`): `POST /v1/admin/sync`,
`POST /v1/admin/hide`, `POST /v1/admin/unhide`, `GET /v1/admin/hidden`.

## Local development

```powershell
npm run db:init:local
Set-Content .dev.vars "ADMIN_TOKEN=local-dev-token"   # delete .dev.vars when done
npm run dev
# in a second window, run one sync (fetches real data from Bifrost):
curl.exe "http://localhost:8787/__scheduled?cron=*/10+*+*+*+*"
```

### Testing the Wardogs recorder without Bifrost

```powershell
npm test                                  # unit tests (Node 22.5+; uses node:sqlite as a D1 stand-in)
node test/mock-bifrost.mjs                # window 1: fake Bifrost on :8799 (synthetic live docs)
Set-Content .dev.vars "ADMIN_TOKEN=local-dev-token`nPLAYER_ID_SALT=local-only-salt-not-for-production-1234`nALLOW_TEST_SNAPSHOTS=1`nBIFROST_BASE_URL=http://127.0.0.1:8799"
npx wrangler dev --port 8790 --test-scheduled  # window 2
node test/seed-local.mjs http://127.0.0.1:8790 local-dev-token   # window 3: four finished matches
curl.exe "http://127.0.0.1:8790/__scheduled?cron=*+*+*+*+*"      # one recorder run
```

`BIFROST_BASE_URL` is only honoured for `http://localhost` / `http://127.0.0.1`, and
`POST /v1/admin/live-snapshot` (used by the seed script) returns 404 unless `ALLOW_TEST_SNAPSHOTS=1`.
`curl.exe "http://127.0.0.1:8799/__status?code=429"` makes the mock answer 429 to test the backoff.
The site's Playwright suite has a Wardogs spec that runs against this Worker:
`cd qa; $env:QA_STATS_API="http://127.0.0.1:8790"; npx playwright test tests/08-wardogs-stats.spec.ts`.
Delete `.dev.vars` when done.

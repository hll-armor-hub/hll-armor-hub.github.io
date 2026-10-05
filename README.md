# Hell Let Loose Armor Hub

Fan-made command center for Hell Let Loose armor and infantry: tank database, Tankulator (U20), artillery and SPA calculators, gunnery sights, identification training, and Vietnam guides.

Live site: [hll-armor-hub.com](https://hll-armor-hub.com)

## Site structure

```
├── index.html          # Redirects to app.html#/community (link-preview meta lives here)
├── app.html            # Main hub (hash-routed SPA)
├── manifest.webmanifest
├── privacy.html
├── css/                # tokens, base, cover, app, legal
├── js/                 # router, data, views
├── data/               # Tank JSON, infantry maps, Vietnam loadouts
├── images/             # Icons, 360 viewers, map art
├── audio/              # Cover ambient track
├── Vietnam/            # Vietnam map art
└── scripts/            # Dev-only tank stat sync (not served)
```

## Local preview

Serve the repo root over HTTP (required for ES modules and `/data` fetches):

```bash
npx serve .
# or: python -m http.server 8123
```

Open `http://localhost:8123/` for the cover, or `http://localhost:8123/app.html` for the hub.

To point the Community hub at a local stats Worker (`worker/`, `npm run dev`), run `localStorage.setItem("aho.statsApi", "http://127.0.0.1:8787")` in the browser console on localhost and reload; `localStorage.removeItem("aho.statsApi")` switches back. The override is ignored on any other host.

## Calculator focus mode

While playing, open a calculator in minimal chrome:

- Artillery: `app.html#/armor/wwii/calculators?focus=artillery`
- SPA: `app.html#/armor/wwii/calculators?focus=spa`
- Tankulator: `app.html#/armor/wwii/tankulator?focus=1`
- Vietnam Tankulator: `app.html#/armor/vietnam/tankulator?focus=1`
- Mortar: `app.html#/infantry/vietnam/mortar?focus=1`
- Wardogs fire mission: `app.html#/wardogs/s1/maps?focus=1` (calculator) or `?focus=map` (2D map + calculator)

Use **Focus** on any calculator page, or install via **Add to Home Screen** (PWA shortcuts in manifest).

## Dev: tank stat sync

Requires Node.js. Updates `data/tanks/*.json` from the Excel workbook:

```bash
npm run sync:tanks          # pull from xlsx
npm run sync:tanks:validate
npm run sync:tanks:push     # push json back to xlsx
```

## Dev: Wardogs cash rewards

After a game patch, re-export the `CashRewardsDataTable` folder and rebuild the Cash Planner data:

```bash
npm run wardogs:cash -- <path-to-CashRewardsDataTable> s1
```

Writes `data/wardogs/<season>/cash-rewards.json` and lists any new rows that need a label. Keep raw exports out of the repo.

## Dev: Wardogs fire mission data

`data/wardogs/<season>/fire-mission.json` drives **Maps & Fire Mission** (`js/views/wardogsFire.js`, math in `js/wardogs-fire-math.js`). Distance and bearing are pure geometry and need only the map size and grid. Elevation needs a range table per weapon. Leave a value `null` / `[]` when it is unknown; the page shows **Needs data** instead of guessing. Set `"verified": true` only once numbers come from the game files.

```jsonc
{
  "version": 1,
  "milsPerCircle": 6400,          // mils in a full circle for the bearing readout (6400 NATO; change if the game uses another)
  "maps": [{
    "id": "custom",               // stable id (saved in localStorage)
    "name": "Plain grid",         // label in the map picker
    "image": null,                // e.g. "/images/wardogs/maps/<id>.webp"; square, north up, edges = map edges. null = plain grid
    "sizeMeters": 2000,           // playable width = height in meters
    "gridCols": 10,               // grid squares across (letters A, B, C…)
    "gridRows": 10,               // grid squares down (numbers 1, 2, 3… from the top)
    "keypad": true,               // squares split 3×3 like a numpad: 7 8 9 top row, 1 2 3 bottom
    "yUp": false,                 // raw "X Y" meter input: false = Y counts down from the top edge, true = up from the bottom
    "verified": false,
    "note": "Free text shown under grid settings"
  }],
  "weapons": [{
    "id": "mortar",
    "name": "Mortar",
    "type": "mortar",             // mortar | spa | other (display only)
    "elevationUnit": "mil",       // "mil" or "deg"
    "minRange": null,             // meters; outside min/max shows Too close / Out of range
    "maxRange": null,
    "table": [],                  // [[rangeMeters, elevation], …] at least 2 rows; linear between rows, never extrapolated
    "verified": false,
    "note": "Where the numbers came from"
  }]
}
```

Format example only, not real values: `"table": [[100, 1500], [200, 1450], [300, 1400]]`. Users can override map size and grid count in the page's **Grid settings**. Those overrides are saved per map id in their browser.

## QA: running the smoke tests

End-to-end smoke tests live in `qa/` (Playwright, driving the installed Microsoft Edge, so no browser download). They cover the Community hub, stats/leaderboard/player search, match pages, nav, the WWII and Vietnam tools, Wardogs, the static pages, and a phone perf summary, on three viewports (`phone` 390×844, `small` 360×780, `desktop` 1280×800). Every test also fails on horizontal page overflow and on console errors / uncaught exceptions (YouTube and Cloudflare beacon noise is ignored).

Start the local server first (bind to 127.0.0.1; the default dual-stack bind returns empty replies on some Windows machines):

```powershell
python -m http.server 8123 --bind 127.0.0.1
```

Then, in another terminal:

```powershell
cd qa
npm.cmd install
npx.cmd playwright test                    # all projects
npx.cmd playwright test --project=phone    # one viewport
npx.cmd playwright show-report             # HTML report
```

Failure screenshots, traces, `console-problems.json` and any `bug-*.png` evidence land in `qa/test-results/`. Tests run one at a time (`workers: 1`) to stay gentle on the local server and the stats APIs. All match data (lists and scoreboards) comes from the stats Worker; the browser must never request anything from `bifroststats.com` (Bifrost's Cloudflare rules block IPs that fetch its JSON quickly, for hours), so any such request is aborted and fails the test. Plain links to Bifrost pages are not followed.

To run the suite against a local Worker (`cd worker; npm run dev`) instead of the deployed one, set `QA_STATS_API` (it sets the localhost-only `aho.statsApi` override in each test browser):

```powershell
$env:QA_STATS_API = "http://127.0.0.1:8787"; npx.cmd playwright test; Remove-Item Env:QA_STATS_API
```

## Deploy

Static GitHub Pages site. Push the repo root; `.nojekyll` disables Jekyll processing. Do not deploy `node_modules/`, `.cursor/`, or the Excel workbook unless you want them public.

## License / disclaimer

Fan-made resource. Not affiliated with Team17 or Expression Games.

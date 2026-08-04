# Hell Let Loose Armor Hub

Fan-made command center for Hell Let Loose armor and infantry: tank database, Tankulator (U20), artillery and SPA calculators, gunnery sights, identification training, and Vietnam guides.

Live site: [hll-armor-hub.com](https://hll-armor-hub.com)

## Site structure

```
├── index.html          # Cover / landing page
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

## Calculator focus mode

While playing, open a calculator in minimal chrome:

- Artillery: `app.html#/armor/wwii/calculators?focus=artillery`
- SPA: `app.html#/armor/wwii/calculators?focus=spa`
- Tankulator: `app.html#/armor/wwii/tankulator?focus=1`
- Mortar: `app.html#/infantry/vietnam/mortar?focus=1`

Use **Focus** on any calculator page, or install via **Add to Home Screen** (PWA shortcuts in manifest).

## Dev: tank stat sync

Requires Node.js. Updates `data/tanks/*.json` from the Excel workbook:

```bash
npm run sync:tanks          # pull from xlsx
npm run sync:tanks:validate
npm run sync:tanks:push     # push json back to xlsx
```

## Deploy

Static GitHub Pages site. Push the repo root; `.nojekyll` disables Jekyll processing. Do not deploy `node_modules/`, `.cursor/`, or the Excel workbook unless you want them public.

## License / disclaimer

Fan-made resource. Not affiliated with Team17 or Expression Games.

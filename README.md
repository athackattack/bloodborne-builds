# Souls Builds

A static, installable tier list of character builds for FromSoftware games, starting with Bloodborne and Elden Ring. It runs in the browser, with no build step and no server, and is published with GitHub Pages from the repository root (`main`, folder `/`).

The site stays at the existing project path (`/bloodborne-builds/` on GitHub Pages). The repository name is unchanged so home-screen shortcuts keep working.

Tiers are an editorial synthesis of community opinion, not an official ranking. Each game’s own caveat is in that game’s About sheet.

## Browse

The header switches games. Bloodborne and Elden Ring each have their own tier list, guides, filters, search, and About text. The choice is kept in `localStorage` and can be linked with the hash (`#bloodborne`, `#elden-ring`, `#elden-ring/build/…`).

- **Tiers** groups builds into S, A, B, and C. Each tier shows how many builds are in it. Cards start compact (name, archetype, main weapon); **Playstyles** expands the short description on every card. The header shows that game’s build total, and About repeats the total with the per-tier counts. Open a card for the tier reason, weapons, the reference stat spread, alternatives, gear, pros and cons, best-for tags, NG+ notes, and source links.
- Stat labels come from each file’s `meta.statOrder`. Bloodborne is VIT / END / STR / SKL / BLT / ARC. Elden Ring is VIG / MND / END / STR / DEX / INT / FTH / ARC. Elden Ring’s `meta.fieldLabels` rename the shared fields (`firearm`, `runesGear`, `weapons`); Bloodborne keeps the default labels when that block is absent.
- **Guides** lists that game’s general pages, filterable by the site types present in the file.
- **About** holds that game’s tier definitions, caveats, and how its stat spreads are labeled.

Source links open in a new tab. A link flagged `unverified` keeps a small marker.

## Data

Facts, numbers, and URLs come only from the JSON files. The app does not add stats or links.

| Game | File |
| --- | --- |
| Bloodborne | [`data/bloodborne.json`](data/bloodborne.json) — 35 builds, 30 guides, snapshot 2026-10-30 |
| Elden Ring | [`data/elden-ring.json`](data/elden-ring.json) — 40 builds, 33 guides, snapshot 2026-10-30 |

[`data/games.json`](data/games.json) is the registry: `id`, `name`, data file path, accent colors, level prefix, stat labels, and the filter chips. Another game is a new data file plus one entry there.

## Install

`manifest.json`, the icons, and `sw.js` make the site installable. The service worker is network-first and names its cache with a version string (`CACHE` in `sw.js`). Icons are an original saw-and-crescent mark, not game artwork.

Serve the repository root with any static file server, or use GitHub Pages on `main` / root. Paths are relative, so the site works at a project-page URL as well as at the domain root.

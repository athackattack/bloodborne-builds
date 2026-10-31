# Souls Builds

A static, installable tier list of character builds for FromSoftware games: Bloodborne, Elden Ring, and Demon's Souls. It runs in the browser, with no build step and no server, and is published with GitHub Pages from the repository root (`main`, folder `/`).

The site stays at the existing project path (`/bloodborne-builds/` on GitHub Pages). The repository name is unchanged so home-screen shortcuts keep working.

Tiers are an editorial synthesis of community opinion, not an official ranking. Each game’s own caveat is in that game’s About sheet.

## Browse

The header switches games. Bloodborne, Elden Ring, and Demon's Souls each have their own tier list, guides, filters, search, and About text, plus a map, a crafting list, and an equipment list when that game’s registry entry points at a file. The choice is kept in `localStorage` and can be linked with the hash (`#bloodborne`, `#elden-ring/map`, `#elden-ring/crafting`, `#elden-ring/equipment/weapons`, `#demons-souls/build/…`). A section is hidden when the registry has no file for it. Switching games keeps the current section when the other game has one, and drops the open card.

- **Tiers** groups builds into S, A, B, and C. Each tier shows how many builds are in it. Cards start compact (name, archetype, main weapon); **Playstyles** expands the short description on every card. The header shows that game’s build total, and About repeats the total with the per-tier counts. Open a card for the tier reason, weapons, the reference stat spread, alternatives, gear, pros and cons, best-for tags, NG+ notes, and source links.
- Stat labels come from each file’s `meta.statOrder`. Bloodborne is VIT / END / STR / SKL / BLT / ARC. Elden Ring is VIG / MND / END / STR / DEX / INT / FTH / ARC. Demon's Souls is VIT / INT / END / STR / DEX / MAG / FTH / LCK. A game’s `meta.fieldLabels` rename the shared fields (`firearm`, `runesGear`, `weapons`); Bloodborne keeps the default labels when that block is absent.
- **Guides** lists that game’s general pages, filterable by the site types present in the file.
- **About** holds that game’s tier definitions, caveats, and how its stat spreads are labeled.
- **Map** reads that game’s map file. A file with `"mode": "embed"` shows embedded maps (Elden Ring uses MapGenie for the Lands Between and Shadow of the Erdtree), loaded only while the Map section is open. A file with `"mode": "images"` shows static pictures in a pan and zoom viewer. Bloodborne opens on the full world map, then the other world maps, then base-game areas and The Old Hunters. Demon's Souls opens on the archstone overview, then the illustrated map, the Nexus, and levels 1-1 through 5-3, with Part tabs where a level has more than one sheet. Each picture has a credit, a license line (or “No license stated”), and a source link. The picture files under `maps/` load when that picture is selected. They are not part of the install cache; after a picture has been viewed, the service worker keeps that response. Fextralife and other outside maps stay ordinary links.
- **Crafting** and **Equipment** read the files named in the registry. All three games use the 2026-10-30 research passes. Those files load when the section opens, then stay in the service-worker cache for offline. A long list shows 24 entries at a time, with Show more for the rest. A recipe material jumps to that material. An equipment sheet lists builds whose weapon, firearm, or gear text includes the name. Bloodborne’s “Blade of Mercy” also matches “Blades of Mercy”, Demon's Souls “Monk's Head Wrappings” also matches “Monk's Head Collar”, and Elden Ring’s “Jar” also matches “Jar helm”. Each list has an About note for the caveats in that pass.

Source links open in a new tab. A link flagged `unverified` keeps a small marker.

## Data

Facts, numbers, and URLs come only from the JSON files. The app does not add stats or links.

| Game | File |
| --- | --- |
| Bloodborne | [`data/bloodborne.json`](data/bloodborne.json) — 35 builds, 30 guides, snapshot 2026-10-30 |
| Elden Ring | [`data/elden-ring.json`](data/elden-ring.json) — 40 builds, 33 guides, snapshot 2026-10-30 |
| Demon's Souls | [`data/demons-souls.json`](data/demons-souls.json) — 33 builds, 34 guides, snapshot 2026-10-30 |

[`data/games.json`](data/games.json) is the registry: `id`, `name`, data file path, optional `map`, `crafting`, and `equipment`, accent colors, level prefix, stat labels, and the filter chips. Another game is a new data file plus one entry there. A map file is either `mode: "embed"` (a list of `embeds` with `embedUrl`, `url`, `label`, and `credit`) or `mode: "images"` (a list of `images` with `id`, `title`, `file`, `description`, `sourceUrl`, `credit`, and `license`, and optional `group`, `level`, and `part` for the picker). Both can include `mapLinks`. Picture files live under `maps/<game>/` and are not precached.

The three build files above are the research snapshots. Crafting and equipment are the same kind of snapshot: Bloodborne (6 categories, 141 items, 21 materials, 14 guides; 5 weapon types, 54 weapons, 36 attire sets, 8 guides), Elden Ring (9 categories, 187 items, 155 materials, 7 guides; 29 weapon types, 82 weapons, 60 armor entries, 4 guides), and Demon's Souls (19 categories, 129 items, 67 materials, 11 guides; 21 weapon types, 97 weapons, 30 armor entries including the Rings list, 11 guides). Map files (`data/*-map.json`) are the embed or image config described above. See [NOTES.md](NOTES.md).

## Install

`manifest.json`, the icons, and `sw.js` make the site installable. The service worker is network-first and names its cache with a version string (`CACHE` in `sw.js`). The header emblem and home-screen icons are original art in `icons/`, not a game publisher logo. `icons/icon-512-maskable.png` keeps the emblem inside the center safe zone.

Serve the repository root with any static file server, or use GitHub Pages on `main` / root. Paths are relative, so the site works at a project-page URL as well as at the domain root.
